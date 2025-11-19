"""User-specific API endpoints for NRL Fantasy team management"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List

from nrl_fantasy.data.storage.database import get_db_session
from nrl_fantasy.data.storage.models import (
    User, UserFantasyTeam, UserFantasySquad, Player, Projection
)
from nrl_fantasy.api.schemas import (
    TeamSyncRequest, TeamSyncResponse,
    UserTeamsResponse, UserTeamSummary,
    TeamDetailResponse, SquadPlayer,
    TeamProjectionResponse, TeamProjectRequest,
    TeamRefreshRequest, TeamRefreshResponse, CaptainSuggestion, Tradesuggestion
)
from nrl_fantasy.integrations.team_sync import TeamSyncService
from nrl_fantasy.integrations.nrl_fantasy_client import NRLFantasyClient
from nrl_fantasy.optimization.team_optimizer import TeamOptimizer
from nrl_fantasy.optimization.bye_planner import ByePlanner
from nrl_fantasy.models.predictor import PlayerPredictor
from nrl_fantasy.config import settings
from nrl_fantasy.utils.logger import setup_logger


router = APIRouter(prefix="/api/user", tags=["user"])
logger = setup_logger(__name__, level="INFO")


@router.post("/sync", response_model=TeamSyncResponse)
async def sync_user_account(
    request: TeamSyncRequest,
    db: Session = Depends(get_db_session)
):
    """
    Sync user's NRL Fantasy account
    
    Authenticates with NRL Fantasy, creates/updates user account,
    and syncs all fantasy teams and squads into the database.
    
    - **username**: NRL Fantasy username/email
    - **password**: NRL Fantasy password
    
    Returns user_id, teams synced count, and player count
    """
    logger.info(f"Starting account sync for user: {request.username}")
    
    try:
        sync_service = TeamSyncService(db)
        
        user, client = sync_service.sync_user_account(request.username, request.password)
        
        if not user or not client:
            logger.error(f"Authentication failed for user: {request.username}")
            raise HTTPException(
                status_code=401,
                detail="Authentication failed: Invalid username or password"
            )
        
        teams = sync_service.sync_user_teams(user.id, client)
        
        total_players = 0
        for team in teams:
            players_synced = sync_service.sync_team_squad(team.id, client)
            total_players += players_synced
        
        if hasattr(client, 'close'):
            client.close()
        elif hasattr(client, '__exit__'):
            client.__exit__(None, None, None)
        
        logger.info(f"Successfully synced user {user.id}: {len(teams)} teams, {total_players} players")
        
        return TeamSyncResponse(
            success=True,
            user_id=user.id,
            teams_synced=len(teams),
            players_synced=total_players,
            message=f"Successfully synced NRL Fantasy account"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing user account: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}"
        )


@router.get("/{user_id}/teams", response_model=UserTeamsResponse)
async def get_user_teams(
    user_id: int,
    db: Session = Depends(get_db_session)
):
    """
    Get user's synced fantasy teams
    
    Returns a list of all fantasy teams for the specified user,
    including team metadata and player counts.
    
    - **user_id**: Database ID of the user
    """
    logger.info(f"Fetching teams for user_id: {user_id}")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    teams = db.query(
        UserFantasyTeam,
        func.count(UserFantasySquad.id).label('player_count')
    ).outerjoin(
        UserFantasySquad,
        UserFantasyTeam.id == UserFantasySquad.team_id
    ).filter(
        UserFantasyTeam.user_id == user_id,
        UserFantasyTeam.is_active == True
    ).group_by(UserFantasyTeam.id).all()
    
    team_summaries = []
    for team, player_count in teams:
        team_summaries.append(UserTeamSummary(
            id=team.id,
            team_name=team.team_name,
            current_round=team.current_round,
            bank_balance=team.bank_balance,
            trades_remaining=team.trades_remaining,
            total_points=team.total_points,
            league_rank=team.league_rank,
            player_count=player_count
        ))
    
    logger.info(f"Found {len(team_summaries)} teams for user {user_id}")
    
    return UserTeamsResponse(
        teams=team_summaries,
        total_count=len(team_summaries)
    )


@router.get("/team/{team_id}", response_model=TeamDetailResponse)
async def get_team_details(
    team_id: int,
    db: Session = Depends(get_db_session)
):
    """
    Get specific team details with full squad
    
    Returns complete team information including all 17 players
    with their positions, captain status, and projections.
    
    - **team_id**: Database ID of the UserFantasyTeam
    """
    logger.info(f"Fetching details for team_id: {team_id}")
    
    team = db.query(UserFantasyTeam).filter(UserFantasyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail=f"Team {team_id} not found")
    
    squad_records = db.query(
        UserFantasySquad,
        Player,
        Projection
    ).join(
        Player,
        UserFantasySquad.player_id == Player.id
    ).outerjoin(
        Projection,
        and_(
            Projection.player_id == Player.id,
            Projection.season == settings.current_season,
            Projection.round == team.current_round
        )
    ).filter(
        UserFantasySquad.team_id == team_id
    ).all()
    
    squad_players = []
    for squad, player, projection in squad_records:
        squad_players.append(SquadPlayer(
            id=squad.id,
            player_id=player.id,
            name=player.name,
            team=player.team,
            position=squad.position,
            is_captain=squad.is_captain,
            is_vice_captain=squad.is_vice_captain,
            is_on_bench=squad.is_on_bench,
            bench_position=squad.bench_position,
            predicted_points=projection.predicted_points if projection else None,
            confidence=projection.confidence if projection else None
        ))
    
    logger.info(f"Retrieved team {team.team_name} with {len(squad_players)} players")
    
    return TeamDetailResponse(
        id=team.id,
        team_name=team.team_name,
        current_round=team.current_round,
        bank_balance=team.bank_balance,
        trades_remaining=team.trades_remaining,
        total_points=team.total_points,
        league_rank=team.league_rank,
        round_created=team.round_created,
        squad=squad_players,
        updated_at=team.updated_at
    )


@router.post("/team/{team_id}/project", response_model=TeamProjectionResponse)
async def project_saved_team(
    team_id: int,
    request: TeamProjectRequest = TeamProjectRequest(),
    db: Session = Depends(get_db_session)
):
    """
    Get team projection and recommendations for saved team
    
    Projects total points for the team, suggests optimal captain/vice-captain,
    and provides trade recommendations based on the saved squad.
    
    - **team_id**: Database ID of the UserFantasyTeam
    - **round** (optional): Override round for projection (defaults to team's current round)
    """
    logger.info(f"Projecting team {team_id}")
    
    team = db.query(UserFantasyTeam).filter(UserFantasyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail=f"Team {team_id} not found")
    
    target_round = request.round or team.current_round
    season = settings.current_season
    
    squad_ids = db.query(UserFantasySquad.player_id).filter(
        UserFantasySquad.team_id == team_id
    ).all()
    player_ids = [sq[0] for sq in squad_ids]
    
    if len(player_ids) < 17:
        raise HTTPException(
            status_code=400,
            detail=f"Team has incomplete squad: {len(player_ids)} players (need 17)"
        )
    
    predictor = PlayerPredictor(db)
    optimizer = TeamOptimizer(db)
    
    for player_id in player_ids:
        existing = db.query(Projection).filter(
            and_(
                Projection.player_id == player_id,
                Projection.season == season,
                Projection.round == target_round
            )
        ).first()
        
        if not existing:
            try:
                prediction = predictor.predict_next_round(player_id, season, target_round)
                predictor.save_projection(
                    player_id, season, target_round,
                    prediction["predicted_points"],
                    prediction["confidence"],
                    prediction["features"]
                )
            except Exception as e:
                logger.warning(f"Could not generate projection for player {player_id}: {e}")
                continue
    
    total = optimizer.calculate_team_projection(player_ids, season, target_round)
    
    captain, vice = optimizer.suggest_captain(player_ids, season, target_round)
    
    trades = optimizer.suggest_trades(
        player_ids, team.bank_balance, season, target_round, limit=3
    )
    
    projections = db.query(Projection, Player).join(Player).filter(
        and_(
            Projection.player_id.in_(player_ids),
            Projection.season == season,
            Projection.round == target_round
        )
    ).all()
    
    player_projections = [
        {
            "player_id": player.id,
            "name": player.name,
            "predicted_points": proj.predicted_points,
            "confidence": proj.confidence
        }
        for proj, player in projections
    ]
    
    logger.info(f"Team {team_id} projected total: {total} points for round {target_round}")
    
    captain_suggestion = CaptainSuggestion(**captain) if captain else CaptainSuggestion(
        player_id=0,
        player_name="No data",
        predicted_points=0,
        confidence=0,
        reason="Insufficient data"
    )
    
    vice_suggestion = CaptainSuggestion(**vice) if vice else CaptainSuggestion(
        player_id=0,
        player_name="No data",
        predicted_points=0,
        confidence=0,
        reason="Insufficient data"
    )
    
    trade_suggestions_models = [Tradesuggestion(**t) for t in trades]
    
    return TeamProjectionResponse(
        total_projected_points=total,
        round=target_round,
        captain_suggestion=captain_suggestion,
        vice_captain_suggestion=vice_suggestion,
        trade_suggestions=trade_suggestions_models,
        player_projections=player_projections
    )


@router.get("/team/{team_id}/bye-analysis")
async def analyze_team_byes(
    team_id: int,
    db: Session = Depends(get_db_session)
):
    """
    Bye round analysis for saved team
    
    Analyzes the team's bye round coverage across rounds 13-17,
    identifies potential issues, and suggests optimal trade timing.
    
    - **team_id**: Database ID of the UserFantasyTeam
    """
    logger.info(f"Analyzing bye coverage for team {team_id}")
    
    team = db.query(UserFantasyTeam).filter(UserFantasyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail=f"Team {team_id} not found")
    
    squad_ids = db.query(UserFantasySquad.player_id).filter(
        UserFantasySquad.team_id == team_id
    ).all()
    player_ids = [sq[0] for sq in squad_ids]
    
    if len(player_ids) < 17:
        raise HTTPException(
            status_code=400,
            detail=f"Team has incomplete squad: {len(player_ids)} players (need 17)"
        )
    
    planner = ByePlanner(db)
    
    bye_analysis = planner.analyze_squad_bye_coverage(player_ids, settings.current_season)
    
    if not bye_analysis:
        return {"error": "No bye round data available"}
    
    trade_suggestions = planner.suggest_bye_trades(
        player_ids,
        settings.current_season,
        team.trades_remaining
    )
    
    total_bye_impact = sum(
        len(round_data['players_on_bye'])
        for round_data in bye_analysis.values()
    )
    
    worst_round = max(
        bye_analysis.items(),
        key=lambda x: len(x[1]['players_on_bye'])
    )
    
    logger.info(f"Team {team_id} bye analysis: {total_bye_impact} total bye players")
    
    return {
        "team_id": team_id,
        "team_name": team.team_name,
        "current_round": team.current_round,
        "trades_remaining": team.trades_remaining,
        "bye_coverage": bye_analysis,
        "total_bye_impact": total_bye_impact,
        "worst_round": {
            "round": worst_round[0],
            "players_affected": len(worst_round[1]['players_on_bye'])
        },
        "trade_suggestions": trade_suggestions,
        "recommendation": _generate_bye_recommendation(
            total_bye_impact,
            team.trades_remaining,
            len(trade_suggestions)
        )
    }


def _generate_bye_recommendation(
    total_bye_impact: int,
    trades_remaining: int,
    trades_needed: int
) -> str:
    """Generate a recommendation based on bye analysis"""
    if total_bye_impact <= 4:
        return "Good bye coverage - should be manageable with bench players"
    elif total_bye_impact <= 8:
        return f"Moderate bye impact - consider {trades_needed} strategic trades"
    elif trades_remaining >= trades_needed:
        return f"High bye impact - {trades_needed} trades recommended, you have sufficient trades"
    else:
        return f"High bye impact - {trades_needed} trades recommended but only {trades_remaining} available. Prioritize worst rounds."


@router.post("/team/{team_id}/refresh", response_model=TeamRefreshResponse)
async def refresh_team_from_nrl(
    team_id: int,
    request: TeamRefreshRequest,
    db: Session = Depends(get_db_session)
):
    """
    Refresh team from NRL Fantasy API
    
    Re-syncs the squad from NRL Fantasy to update player selections,
    captain choices, and team metadata.
    
    - **team_id**: Database ID of the UserFantasyTeam
    - **password**: User's NRL Fantasy password for re-authentication
    """
    logger.info(f"Refreshing team {team_id} from NRL Fantasy")
    
    team = db.query(UserFantasyTeam).filter(UserFantasyTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail=f"Team {team_id} not found")
    
    user = db.query(User).filter(User.id == team.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found for team {team_id}")
    
    if not user.nrl_fantasy_username:
        raise HTTPException(
            status_code=400,
            detail="User does not have NRL Fantasy credentials stored"
        )
    
    try:
        sync_service = TeamSyncService(db)
        
        client = NRLFantasyClient(username=user.nrl_fantasy_username, password=request.password)
        
        if not client.login():
            logger.error(f"Authentication failed for team refresh {team_id}")
            raise HTTPException(
                status_code=401,
                detail="Authentication failed: Could not authenticate with NRL Fantasy"
            )
        
        players_updated = sync_service.sync_team_squad(team.id, client)
        
        if hasattr(client, 'close'):
            client.close()
        elif hasattr(client, '__exit__'):
            client.__exit__(None, None, None)
        
        logger.info(f"Team {team_id} refreshed: {players_updated} players updated")
        
        return TeamRefreshResponse(
            success=True,
            team_id=team_id,
            players_updated=players_updated,
            message=f"Team refreshed successfully: {players_updated} players updated"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing team {team_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Refresh failed: {str(e)}"
        )

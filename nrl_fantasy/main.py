"""Main FastAPI application for NRL Fantasy Edge"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn

from nrl_fantasy.config import settings
from nrl_fantasy.data.storage.database import init_db, get_db_session
from nrl_fantasy.api.schemas import (
    PlayerProjectionResponse,
    TeamProjectionRequest,
    TeamProjectionResponse,
    ValuePicksResponse,
    HealthCheckResponse,
    PlayerInfo
)
from nrl_fantasy.models.predictor import PlayerPredictor
from nrl_fantasy.optimization.team_optimizer import TeamOptimizer
from nrl_fantasy.data.storage.models import Player, Projection, FantasyPriceHistory
from nrl_fantasy.api.advanced_endpoints import router as advanced_router
from sqlalchemy import and_

# Initialize FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="AI-powered NRL Fantasy predictions and optimization"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Include advanced endpoints router
app.include_router(advanced_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print(f"🚀 {settings.api_title} v{settings.api_version} started")


@app.get("/")
async def root():
    """Serve the frontend UI"""
    return FileResponse(str(static_path / "index.html"))


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.api_title,
        "version": settings.api_version
    }


@app.get("/api/players/{player_id}/projection", response_model=PlayerProjectionResponse)
async def get_player_projection(
    player_id: int,
    round: Optional[int] = None,
    db: Session = Depends(get_db_session)
):
    """Get next-round projection for a specific player"""
    season = settings.current_season
    target_round = round or 6  # Default to next round
    
    # Get player
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get or create projection
    predictor = PlayerPredictor(db)
    try:
        prediction = predictor.predict_next_round(player_id, season, target_round)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating prediction: {str(e)}")
    
    return {
        "player": {
            "id": player.id,
            "name": player.name,
            "team": player.team,
            "positions": player.positions.split(",")
        },
        "round": target_round,
        "season": season,
        "predicted_points": prediction["predicted_points"],
        "confidence": prediction["confidence"],
        "recent_form": prediction["features"],
        "opponent": None
    }


@app.post("/api/team/project", response_model=TeamProjectionResponse)
async def project_team(
    request: TeamProjectionRequest,
    db: Session = Depends(get_db_session)
):
    """Project team total and suggest captain"""
    season = settings.current_season
    target_round = request.round or 6
    
    player_ids = [p.player_id for p in request.players]
    
    # Ensure projections exist
    predictor = PlayerPredictor(db)
    optimizer = TeamOptimizer(db)
    
    # Generate projections if not exist
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
                print(f"Warning: Could not generate projection for player {player_id}: {e}")
                continue
    
    # Calculate team total
    total = optimizer.calculate_team_projection(player_ids, season, target_round)
    
    # Get captain suggestions
    captain, vice = optimizer.suggest_captain(player_ids, season, target_round)
    
    # Get trade suggestions
    trades = optimizer.suggest_trades(
        player_ids, request.bank_balance, season, target_round, limit=3
    )
    
    # Get player projections
    projections = db.query(Projection, Player).join(Player).filter(
        and_(
            Projection.player_id.in_(player_ids),
            Projection.season == season,
            Projection.round == target_round
        )
    ).all()
    
    player_projections = [
        {
            "player_id": p.id,
            "name": player.name,
            "predicted_points": p.predicted_points,
            "confidence": p.confidence
        }
        for p, player in projections
    ]
    
    return {
        "total_projected_points": total,
        "round": target_round,
        "captain_suggestion": captain or {
            "player_id": 0,
            "player_name": "No data",
            "predicted_points": 0,
            "confidence": 0,
            "reason": "Insufficient data"
        },
        "vice_captain_suggestion": vice or {
            "player_id": 0,
            "player_name": "No data",
            "predicted_points": 0,
            "confidence": 0,
            "reason": "Insufficient data"
        },
        "trade_suggestions": trades,
        "player_projections": player_projections
    }


@app.get("/api/players/value-picks", response_model=ValuePicksResponse)
async def get_value_picks(
    position: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db_session)
):
    """Get top value players by position"""
    season = settings.current_season
    round_num = 6
    
    # Get projections with price data
    query = db.query(Projection, Player, FantasyPriceHistory).select_from(Projection).join(
        Player, Projection.player_id == Player.id
    ).outerjoin(
        FantasyPriceHistory,
        and_(
            FantasyPriceHistory.player_id == Player.id,
            FantasyPriceHistory.season == season,
            FantasyPriceHistory.round == round_num - 1
        )
    ).filter(
        Projection.season == season,
        Projection.round == round_num
    )
    
    if position:
        query = query.filter(Player.positions.like(f"%{position}%"))
    
    results = query.all()
    
    # Calculate value scores
    value_picks = []
    for proj, player, price_hist in results:
        price = price_hist.price if price_hist else 400
        value_score = (proj.predicted_points / max(1, price)) * 100
        
        value_picks.append({
            "player_id": player.id,
            "name": player.name,
            "team": player.team,
            "position": player.positions,
            "price": price,
            "predicted_points": proj.predicted_points,
            "value_score": round(value_score, 2)
        })
    
    # Sort by value score
    value_picks.sort(key=lambda x: x["value_score"], reverse=True)
    
    return {
        "picks": value_picks[:limit],
        "position_filter": position,
        "total_count": len(value_picks)
    }


if __name__ == "__main__":
    uvicorn.run(
        "nrl_fantasy.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

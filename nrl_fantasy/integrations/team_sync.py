"""
Team Sync Service - Import NRL Fantasy squads into database

This module provides functionality to sync user fantasy teams and squads from
the NRL Fantasy API into the local database.

Usage Example:
    from nrl_fantasy.data.storage.database import get_db
    from nrl_fantasy.integrations.team_sync import TeamSyncService
    
    with get_db() as db:
        sync_service = TeamSyncService(db)
        
        # Full sync for a user (recommended - handles authentication automatically)
        summary = sync_service.full_sync("username", "password")
        print(f"Synced {summary['teams_synced']} teams, {summary['players_synced']} players")
        
        # Or sync individual components with manual authentication
        user, client = sync_service.sync_user_account("username", "password")
        if user and client:
            try:
                teams = sync_service.sync_user_teams(user.id, client)
                for team in teams:
                    sync_service.sync_team_squad(team.id, client)
            finally:
                # Clean up client when done
                if hasattr(client, 'close'):
                    client.close()
                elif hasattr(client, '__exit__'):
                    client.__exit__(None, None, None)
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .nrl_fantasy_client import NRLFantasyClient
from ..data.storage.models import User, UserFantasyTeam, UserFantasySquad, Player
from ..utils.logger import setup_logger


class TeamSyncService:
    """
    Service for syncing NRL Fantasy teams and squads into the database.
    
    This service handles:
    - User account authentication and creation
    - Fantasy team synchronization
    - Squad player synchronization with positions and captain status
    - Complete full sync operations
    
    Attributes:
        db: SQLAlchemy database session
        logger: Configured logger instance
    """
    
    def __init__(self, db: Session):
        """
        Initialize the Team Sync Service.
        
        Args:
            db: SQLAlchemy database session for database operations
        """
        self.db = db
        self.logger = setup_logger(__name__, level="INFO")
        self.logger.info("TeamSyncService initialized")
    
    def sync_user_account(
        self, 
        username: str, 
        password: str
    ) -> Tuple[Optional[User], Optional[NRLFantasyClient]]:
        """
        Authenticate with NRL Fantasy and create/update user account.
        
        This method:
        1. Authenticates with NRL Fantasy API using provided credentials
        2. Retrieves user profile information
        3. Creates a new User record or updates existing one
        4. Sets last_sync_at timestamp
        5. Returns both User and authenticated client for reuse
        
        Args:
            username: NRL Fantasy username/email
            password: NRL Fantasy password
        
        Returns:
            Tuple of (User object, authenticated NRLFantasyClient) if successful,
            (None, None) if authentication or sync failed
        """
        self.logger.info(f"Starting user account sync for: {username}")
        
        # Initialize and authenticate NRL Fantasy client
        client = NRLFantasyClient(username=username, password=password)
        
        if not client.login():
            self.logger.error(f"Authentication failed for user: {username}")
            return None, None
        
        self.logger.info("Authentication successful")
        
        # TODO: After endpoint discovery, use actual user profile endpoint
        # Example: user_profile = client.get_user_profile()
        # For now, use placeholder data structure
        user_profile = {
            'user_id': client.user_id or 'unknown',
            'email': username,  # Assuming username is email
            'username': username,
            'display_name': None,  # Will be populated from API response
        }
        
        # Try to find existing user by email or username
        try:
            user = self.db.query(User).filter(
                (User.email == username) | 
                (User.nrl_fantasy_username == username)
            ).first()
            
            if user:
                # Update existing user
                self.logger.info(f"Updating existing user: {user.id}")
                user.last_sync_at = datetime.utcnow()
                user.is_active = True
                
                # Update fields if we have new data
                if user_profile.get('display_name'):
                    user.display_name = user_profile['display_name']
                if user_profile.get('username') and not user.nrl_fantasy_username:
                    user.nrl_fantasy_username = user_profile['username']
                
            else:
                # Create new user
                self.logger.info("Creating new user account")
                user = User(
                    email=username,
                    nrl_fantasy_username=user_profile.get('username', username),
                    display_name=user_profile.get('display_name'),
                    last_sync_at=datetime.utcnow(),
                    is_active=True
                )
                self.db.add(user)
            
            self.db.commit()
            self.db.refresh(user)
            
            self.logger.info(f"User account synced successfully: {user.id}")
            return user, client
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error during user sync: {e}")
            self.db.rollback()
            return None, None
        except Exception as e:
            self.logger.error(f"Unexpected error during user sync: {e}")
            self.db.rollback()
            return None, None
    
    def sync_user_teams(
        self, 
        user_id: int, 
        client: NRLFantasyClient
    ) -> List[UserFantasyTeam]:
        """
        Fetch and sync all fantasy teams for a user.
        
        This method:
        1. Retrieves fantasy teams from NRL Fantasy API using authenticated client
        2. Creates/updates UserFantasyTeam records for each team
        3. Updates team metadata (name, round, bank balance, trades)
        
        Args:
            user_id: Database ID of the user
            client: Authenticated NRLFantasyClient instance
        
        Returns:
            List of synced UserFantasyTeam objects
        """
        self.logger.info(f"Starting team sync for user_id: {user_id}")
        
        # Get user to verify it exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            self.logger.error(f"User not found: {user_id}")
            return []
        
        synced_teams = []
        
        # TODO: After endpoint discovery, use actual teams endpoint
        # Example: teams_data = client.get_user_teams()
        teams_data = client.get_user_teams()
        
        if teams_data is None:
            error_msg = f"API returned None for teams data (user: {user_id}). Possible API failure."
            self.logger.error(error_msg)
            return []
        
        if not teams_data:
            self.logger.warning(f"No teams found for user: {user_id}")
            return []
        
        # Process each team
        for team_data in teams_data:
            try:
                synced_team = self._sync_single_team(user_id, team_data)
                if synced_team:
                    synced_teams.append(synced_team)
            except Exception as e:
                self.logger.error(f"Error syncing team: {e}")
                continue
        
        self.logger.info(f"Synced {len(synced_teams)} teams for user {user_id}")
        return synced_teams
    
    def _sync_single_team(
        self, 
        user_id: int, 
        team_data: Dict[str, Any]
    ) -> Optional[UserFantasyTeam]:
        """
        Create or update a single fantasy team record.
        
        Args:
            user_id: Database ID of the user
            team_data: Team data from NRL Fantasy API
        
        Returns:
            UserFantasyTeam object if successful, None otherwise
        """
        try:
            # TODO: Map actual API field names after endpoint discovery
            # Expected fields (adjust based on actual API response):
            # - team_id / id
            # - team_name / name
            # - round_created / created_round
            # - bank / salary_cap / remaining_budget
            # - trades / trades_remaining
            # - current_round / round
            # - total_points / points
            # - rank / league_rank
            
            # Map API data to our model (placeholder mapping)
            nrl_team_id = str(team_data.get('id') or team_data.get('team_id', 'unknown'))
            team_name = team_data.get('name') or team_data.get('team_name', 'My Team')
            round_created = team_data.get('created_round', 1)
            bank_balance = team_data.get('bank', 0)
            trades_remaining = team_data.get('trades_remaining', 0)
            current_round = team_data.get('current_round', 1)
            total_points = team_data.get('total_points')
            league_rank = team_data.get('rank')
            
            # Check if team already exists
            team = self.db.query(UserFantasyTeam).filter(
                UserFantasyTeam.user_id == user_id,
                UserFantasyTeam.nrl_team_id == nrl_team_id
            ).first()
            
            if team:
                # Update existing team
                self.logger.debug(f"Updating existing team: {team.id}")
                team.team_name = team_name
                team.bank_balance = bank_balance
                team.trades_remaining = trades_remaining
                team.current_round = current_round
                team.total_points = total_points
                team.league_rank = league_rank
                team.updated_at = datetime.utcnow()
                team.is_active = True
            else:
                # Create new team
                self.logger.debug(f"Creating new team: {team_name}")
                team = UserFantasyTeam(
                    user_id=user_id,
                    nrl_team_id=nrl_team_id,
                    team_name=team_name,
                    round_created=round_created,
                    bank_balance=bank_balance,
                    trades_remaining=trades_remaining,
                    current_round=current_round,
                    total_points=total_points,
                    league_rank=league_rank,
                    is_active=True
                )
                self.db.add(team)
            
            self.db.commit()
            self.db.refresh(team)
            
            self.logger.info(f"Team synced: {team.team_name} (ID: {team.id})")
            return team
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error syncing team: {e}")
            self.db.rollback()
            return None
        except Exception as e:
            self.logger.error(f"Error syncing team: {e}")
            self.db.rollback()
            return None
    
    def sync_team_squad(
        self, 
        team_id: int, 
        client: NRLFantasyClient
    ) -> int:
        """
        Fetch and sync squad composition for a fantasy team.
        
        This method:
        1. Retrieves the 17-player squad from NRL Fantasy API using authenticated client
        2. Creates/updates UserFantasySquad records with positions
        3. Sets captain and vice-captain flags
        4. Handles bench positions
        5. Only removes players when we have valid squad data (prevents data loss on API failures)
        
        Args:
            team_id: Database ID of the UserFantasyTeam
            client: Authenticated NRLFantasyClient instance
        
        Returns:
            Number of players synced successfully
        """
        self.logger.info(f"Starting squad sync for team_id: {team_id}")
        
        # Get team record
        team = self.db.query(UserFantasyTeam).filter(
            UserFantasyTeam.id == team_id
        ).first()
        
        if not team:
            self.logger.error(f"Team not found: {team_id}")
            return 0
        
        # TODO: After endpoint discovery, use actual squad endpoint
        # Example: squad_data = client.get_team_squad(team.nrl_team_id)
        # For now, use placeholder - would need client with auth
        
        # TODO: Implement actual squad endpoint call
        # squad_data = client.get_team_squad(team.nrl_team_id)
        
        # Placeholder squad data structure
        # Expected format after endpoint discovery:
        # [
        #   {
        #     'player_id': 123,
        #     'position': 'FLB',
        #     'is_captain': False,
        #     'is_vice_captain': False,
        #     'on_bench': False,
        #     'bench_position': None
        #   },
        #   ...
        # ]
        squad_data = []  # Will be populated from API
        
        if squad_data is None:
            error_msg = f"API returned None for squad data (team: {team_id}). Possible API failure."
            self.logger.error(error_msg)
            return 0
        
        if not squad_data:
            self.logger.warning(
                f"No squad data retrieved for team {team_id}. "
                "This is expected until endpoint discovery is complete. "
                "Not removing existing squad data to prevent data loss."
            )
            return 0
        
        # Track synced player IDs for cleanup
        synced_player_ids = []
        players_synced = 0
        
        for player_data in squad_data:
            try:
                player_synced = self._sync_single_squad_player(
                    team_id, 
                    player_data,
                    team.current_round
                )
                if player_synced:
                    players_synced += 1
                    synced_player_ids.append(player_data.get('player_id'))
            except Exception as e:
                self.logger.error(f"Error syncing squad player: {e}")
                continue
        
        # Only remove players if we successfully synced some data
        # This prevents data loss when API returns empty results due to failures
        if synced_player_ids:
            try:
                removed = self.db.query(UserFantasySquad).filter(
                    UserFantasySquad.team_id == team_id,
                    ~UserFantasySquad.player_id.in_(synced_player_ids)
                ).delete(synchronize_session=False)
                
                if removed > 0:
                    self.logger.info(f"Removed {removed} players no longer in squad")
                    self.db.commit()
            except SQLAlchemyError as e:
                self.logger.error(f"Error removing old squad players: {e}")
                self.db.rollback()
        
        self.logger.info(f"Synced {players_synced} players for team {team_id}")
        return players_synced
    
    def _sync_single_squad_player(
        self,
        team_id: int,
        player_data: Dict[str, Any],
        current_round: int
    ) -> bool:
        """
        Create or update a single squad player record.
        
        Args:
            team_id: Database ID of the UserFantasyTeam
            player_data: Player data from NRL Fantasy API
            current_round: Current round number
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # TODO: Map actual API field names after endpoint discovery
            nrl_player_id = player_data.get('player_id') or player_data.get('id')
            position = player_data.get('position', 'UNKNOWN')
            is_captain = player_data.get('is_captain', False)
            is_vice_captain = player_data.get('is_vice_captain', False)
            is_on_bench = player_data.get('on_bench', False)
            bench_position = player_data.get('bench_position')
            
            # Find player in our database
            # TODO: Map nrl_player_id to our Player table
            player = self.db.query(Player).filter(
                (Player.nrl_id == str(nrl_player_id)) |
                (Player.fantasy_id == str(nrl_player_id))
            ).first()
            
            if not player:
                self.logger.warning(
                    f"Player not found in database: {nrl_player_id}. "
                    "Skipping squad sync for this player."
                )
                return False
            
            # Check if squad record exists
            squad_record = self.db.query(UserFantasySquad).filter(
                UserFantasySquad.team_id == team_id,
                UserFantasySquad.player_id == player.id
            ).first()
            
            if squad_record:
                # Update existing record
                squad_record.position = position
                squad_record.is_captain = is_captain
                squad_record.is_vice_captain = is_vice_captain
                squad_record.is_on_bench = is_on_bench
                squad_record.bench_position = bench_position
                squad_record.updated_at = datetime.utcnow()
            else:
                # Create new record
                squad_record = UserFantasySquad(
                    team_id=team_id,
                    player_id=player.id,
                    position=position,
                    is_captain=is_captain,
                    is_vice_captain=is_vice_captain,
                    is_on_bench=is_on_bench,
                    bench_position=bench_position,
                    added_round=current_round
                )
                self.db.add(squad_record)
            
            self.db.commit()
            return True
            
        except SQLAlchemyError as e:
            self.logger.error(f"Database error syncing squad player: {e}")
            self.db.rollback()
            return False
        except Exception as e:
            self.logger.error(f"Error syncing squad player: {e}")
            self.db.rollback()
            return False
    
    def full_sync(self, username: str, password: str) -> Dict[str, Any]:
        """
        Perform a complete sync: account → teams → squads.
        
        This is the main entry point for syncing a user's complete
        fantasy data from NRL Fantasy into the local database.
        
        Steps:
        1. Authenticate and sync user account (returns authenticated client)
        2. Sync all fantasy teams for the user (using authenticated client)
        3. Sync squad composition for each team (using authenticated client)
        4. Clean up authenticated client
        
        Args:
            username: NRL Fantasy username/email
            password: NRL Fantasy password
        
        Returns:
            Dictionary with sync summary:
            {
                'success': bool,
                'user_id': int or None,
                'teams_synced': int,
                'players_synced': int,
                'errors': list of error messages
            }
        """
        self.logger.info(f"Starting full sync for user: {username}")
        
        summary = {
            'success': False,
            'user_id': None,
            'teams_synced': 0,
            'players_synced': 0,
            'errors': []
        }
        
        client = None
        
        try:
            # Step 1: Sync user account and get authenticated client
            self.logger.info("Step 1: Syncing user account...")
            user, client = self.sync_user_account(username, password)
            
            if not user or not client:
                error_msg = "Failed to sync user account - authentication failed"
                self.logger.error(error_msg)
                summary['errors'].append(error_msg)
                return summary
            
            summary['user_id'] = user.id
            self.logger.info(f"✓ User account synced: {user.id}")
            
            # Step 2: Sync fantasy teams using authenticated client
            self.logger.info("Step 2: Syncing fantasy teams...")
            teams = self.sync_user_teams(user.id, client)
            
            if not teams:
                error_msg = "No teams found or failed to sync teams"
                self.logger.warning(error_msg)
                summary['errors'].append(error_msg)
                # Still mark as partial success if user was synced
                summary['success'] = True
                return summary
            
            summary['teams_synced'] = len(teams)
            self.logger.info(f"✓ Synced {len(teams)} team(s)")
            
            # Step 3: Sync squads for each team using authenticated client
            self.logger.info("Step 3: Syncing team squads...")
            total_players = 0
            
            for team in teams:
                try:
                    players_count = self.sync_team_squad(team.id, client)
                    total_players += players_count
                    self.logger.info(
                        f"✓ Synced {players_count} players for team '{team.team_name}'"
                    )
                except Exception as e:
                    error_msg = f"Failed to sync squad for team {team.id}: {e}"
                    self.logger.error(error_msg)
                    summary['errors'].append(error_msg)
            
            summary['players_synced'] = total_players
            summary['success'] = True
            
            self.logger.info(
                f"Full sync complete! Teams: {summary['teams_synced']}, "
                f"Players: {summary['players_synced']}"
            )
            
        except Exception as e:
            error_msg = f"Unexpected error during full sync: {e}"
            self.logger.error(error_msg)
            summary['errors'].append(error_msg)
        
        finally:
            # Clean up the authenticated client
            if client:
                try:
                    if hasattr(client, 'close'):
                        client.close()
                    elif hasattr(client, '__exit__'):
                        client.__exit__(None, None, None)
                except Exception as e:
                    self.logger.warning(f"Error closing client: {e}")
        
        return summary
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup if needed."""
        # Database session is managed externally, no cleanup needed here
        pass

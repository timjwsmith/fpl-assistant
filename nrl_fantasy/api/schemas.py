"""Pydantic schemas for API requests and responses"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PlayerInfo(BaseModel):
    """Basic player information"""
    id: int
    name: str
    team: str
    positions: List[str]


class PlayerProjectionResponse(BaseModel):
    """Response for player projection"""
    player: PlayerInfo
    round: int
    season: int
    predicted_points: float
    confidence: float
    recent_form: dict
    opponent: Optional[str] = None


class TeamPlayer(BaseModel):
    """Player in user's team"""
    player_id: int
    name: Optional[str] = None
    position: str
    is_captain: bool = False
    is_vice_captain: bool = False


class TeamProjectionRequest(BaseModel):
    """Request body for team projection"""
    players: List[TeamPlayer] = Field(min_length=17, max_length=17)
    round: Optional[int] = None
    bank_balance: float = 0.0
    trades_remaining: int = 0


class CaptainSuggestion(BaseModel):
    """Captain suggestion"""
    player_id: int
    player_name: str
    predicted_points: float
    confidence: float
    reason: str


class Tradesuggestion(BaseModel):
    """Trade suggestion"""
    trade_out_id: int
    trade_out_name: str
    trade_in_id: int
    trade_in_name: str
    projected_gain: float
    reason: str


class TeamProjectionResponse(BaseModel):
    """Response for team projection"""
    total_projected_points: float
    round: int
    captain_suggestion: CaptainSuggestion
    vice_captain_suggestion: CaptainSuggestion
    trade_suggestions: List[Tradesuggestion]
    player_projections: List[dict]


class ValuePick(BaseModel):
    """Value pick player"""
    player_id: int
    name: str
    team: str
    position: str
    price: int
    predicted_points: float
    value_score: float  # points per 100k


class ValuePicksResponse(BaseModel):
    """Response for value picks"""
    picks: List[ValuePick]
    position_filter: Optional[str] = None
    total_count: int


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


class TeamSyncRequest(BaseModel):
    """Request for syncing NRL Fantasy account"""
    username: str
    password: str


class TeamSyncResponse(BaseModel):
    """Response from team sync operation"""
    success: bool
    user_id: Optional[int] = None
    teams_synced: int = 0
    players_synced: int = 0
    message: str
    error: Optional[str] = None


class SquadPlayer(BaseModel):
    """Player in a fantasy squad"""
    id: int
    player_id: int
    name: str
    team: str
    position: str
    is_captain: bool
    is_vice_captain: bool
    is_on_bench: bool
    bench_position: Optional[int] = None
    predicted_points: Optional[float] = None
    confidence: Optional[float] = None


class UserTeamSummary(BaseModel):
    """Summary of a user's fantasy team"""
    id: int
    team_name: str
    current_round: int
    bank_balance: int
    trades_remaining: int
    total_points: Optional[int] = None
    league_rank: Optional[int] = None
    player_count: int


class UserTeamsResponse(BaseModel):
    """Response containing user's teams"""
    teams: List[UserTeamSummary]
    total_count: int


class TeamDetailResponse(BaseModel):
    """Detailed team information with full squad"""
    id: int
    team_name: str
    current_round: int
    bank_balance: int
    trades_remaining: int
    total_points: Optional[int] = None
    league_rank: Optional[int] = None
    round_created: int
    squad: List[SquadPlayer]
    updated_at: datetime


class TeamProjectRequest(BaseModel):
    """Request for team projection (optional round override)"""
    round: Optional[int] = None


class TeamRefreshRequest(BaseModel):
    """Request for team refresh operation"""
    password: str


class TeamRefreshResponse(BaseModel):
    """Response from team refresh operation"""
    success: bool
    team_id: int
    players_updated: int
    message: str
    error: Optional[str] = None

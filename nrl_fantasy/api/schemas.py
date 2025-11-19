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

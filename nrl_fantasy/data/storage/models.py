"""SQLAlchemy models for NRL Fantasy database"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class Player(Base):
    """NRL Player entity"""
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nrl_id = Column(String(50), unique=True, nullable=True)
    fantasy_id = Column(String(50), unique=True, nullable=True)
    name = Column(String(200), nullable=False)
    team = Column(String(100), nullable=False)
    positions = Column(String(100), nullable=False)  # Comma-separated
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    match_stats = relationship("PlayerMatchStats", back_populates="player")
    fantasy_scores = relationship("FantasyScore", back_populates="player")
    price_history = relationship("FantasyPriceHistory", back_populates="player")
    projections = relationship("Projection", back_populates="player")


class Match(Base):
    """NRL Match entity"""
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    season = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    venue = Column(String(200))
    home_score = Column(Integer)
    away_score = Column(Integer)
    completed = Column(Boolean, default=False)
    
    # Relationships
    player_stats = relationship("PlayerMatchStats", back_populates="match")
    fantasy_scores = relationship("FantasyScore", back_populates="match")


class PlayerMatchStats(Base):
    """Player performance statistics for a specific match"""
    __tablename__ = "player_match_stats"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Core stats
    minutes = Column(Integer, default=0)
    tries = Column(Integer, default=0)
    try_assists = Column(Integer, default=0)
    linebreak_assists = Column(Integer, default=0)
    line_breaks = Column(Integer, default=0)
    runs = Column(Integer, default=0)
    run_metres = Column(Integer, default=0)
    post_contact_metres = Column(Integer, default=0)
    tackle_breaks = Column(Integer, default=0)
    tackles = Column(Integer, default=0)
    missed_tackles = Column(Integer, default=0)
    offloads = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    penalties_conceded = Column(Integer, default=0)
    sin_bins = Column(Integer, default=0)
    send_offs = Column(Integer, default=0)
    kicks = Column(Integer, default=0)
    kick_metres = Column(Integer, default=0)
    forced_dropouts = Column(Integer, default=0)
    intercepts = Column(Integer, default=0)
    
    # Relationships
    player = relationship("Player", back_populates="match_stats")
    match = relationship("Match", back_populates="player_stats")


class FantasyScoringRule(Base):
    """Fantasy scoring rules by season"""
    __tablename__ = "fantasy_scoring_rules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    season = Column(Integer, nullable=False)
    stat_key = Column(String(100), nullable=False)
    points = Column(Float, nullable=False)
    formula_type = Column(String(50), default="flat")  # flat, per_10, per_30, etc.
    description = Column(Text)


class FantasyScore(Base):
    """Calculated fantasy points for player in a match"""
    __tablename__ = "fantasy_scores"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    round = Column(Integer, nullable=False)
    season = Column(Integer, nullable=False)
    fantasy_points = Column(Float, nullable=False)
    calculated_points = Column(Float)  # Our calculated score
    error_margin = Column(Float)  # Difference between actual and calculated
    
    # Relationships
    player = relationship("Player", back_populates="fantasy_scores")
    match = relationship("Match", back_populates="fantasy_scores")


class FantasyPriceHistory(Base):
    """Historical fantasy prices and metadata"""
    __tablename__ = "fantasy_price_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    round = Column(Integer, nullable=False)
    season = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)  # In thousands
    price_change = Column(Integer, default=0)
    breakeven = Column(Float)
    ownership_pct = Column(Float)
    
    # Relationships
    player = relationship("Player", back_populates="price_history")


class Projection(Base):
    """Predicted fantasy scores for upcoming rounds"""
    __tablename__ = "projections"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    round = Column(Integer, nullable=False)
    season = Column(Integer, nullable=False)
    predicted_points = Column(Float, nullable=False)
    confidence = Column(Float)  # 0-1 confidence score
    model_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Features used for prediction (stored as metadata)
    avg_last_3 = Column(Float)
    avg_last_5 = Column(Float)
    avg_minutes = Column(Float)
    opponent_defense_rating = Column(Float)
    
    # Relationships
    player = relationship("Player", back_populates="projections")


class User(Base):
    """User account for NRL Fantasy integration"""
    __tablename__ = "nrl_users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    nrl_fantasy_username = Column(String(200), nullable=True)
    display_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    fantasy_teams = relationship("UserFantasyTeam", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', display_name='{self.display_name}')>"


class UserFantasyTeam(Base):
    """User's NRL Fantasy team"""
    __tablename__ = "user_fantasy_teams"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("nrl_users.id"), nullable=False)
    nrl_team_id = Column(String(100), nullable=False)
    team_name = Column(String(200), nullable=False)
    round_created = Column(Integer, nullable=False)
    bank_balance = Column(Integer, default=0)
    trades_remaining = Column(Integer, default=0)
    current_round = Column(Integer, nullable=False)
    total_points = Column(Integer, nullable=True)
    league_rank = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", back_populates="fantasy_teams")
    squad_players = relationship("UserFantasySquad", back_populates="team")
    
    def __repr__(self):
        return f"<UserFantasyTeam(id={self.id}, team_name='{self.team_name}', user_id={self.user_id})>"


class UserFantasySquad(Base):
    """Player selection in user's fantasy team"""
    __tablename__ = "user_fantasy_squad"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("user_fantasy_teams.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    position = Column(String(50), nullable=False)
    is_captain = Column(Boolean, default=False)
    is_vice_captain = Column(Boolean, default=False)
    is_on_bench = Column(Boolean, default=False)
    bench_position = Column(Integer, nullable=True)
    added_round = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team = relationship("UserFantasyTeam", back_populates="squad_players")
    player = relationship("Player")
    
    def __repr__(self):
        return f"<UserFantasySquad(id={self.id}, team_id={self.team_id}, player_id={self.player_id}, position='{self.position}')>"

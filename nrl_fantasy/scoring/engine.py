"""NRL Fantasy scoring engine that replicates official rules"""
from typing import Dict
from sqlalchemy.orm import Session
from nrl_fantasy.data.storage.models import FantasyScoringRule, PlayerMatchStats


class ScoringEngine:
    """Calculate fantasy points based on player match statistics"""
    
    def __init__(self, db: Session, season: int = 2024):
        self.db = db
        self.season = season
        self.rules = self._load_scoring_rules()
    
    def _load_scoring_rules(self) -> Dict[str, Dict]:
        """Load scoring rules from database for the season"""
        rules = self.db.query(FantasyScoringRule).filter(
            FantasyScoringRule.season == self.season
        ).all()
        
        rules_dict = {}
        for rule in rules:
            rules_dict[rule.stat_key] = {
                "points": rule.points,
                "formula_type": rule.formula_type
            }
        
        return rules_dict
    
    def calculate_points(self, stats: PlayerMatchStats) -> float:
        """Calculate fantasy points from player match stats"""
        total_points = 0.0
        
        # Map stat fields to values
        stat_values = {
            "tries": stats.tries,
            "try_assists": stats.try_assists,
            "linebreak_assists": stats.linebreak_assists,
            "line_breaks": stats.line_breaks,
            "run_metres": stats.run_metres,
            "tackle_breaks": stats.tackle_breaks,
            "tackles": stats.tackles,
            "offloads": stats.offloads,
            "kick_metres": stats.kick_metres,
            "forced_dropouts": stats.forced_dropouts,
            "intercepts": stats.intercepts,
            "missed_tackles": stats.missed_tackles,
            "errors": stats.errors,
            "penalties_conceded": stats.penalties_conceded,
            "sin_bins": stats.sin_bins,
            "send_offs": stats.send_offs
        }
        
        # Apply scoring rules
        for stat_key, value in stat_values.items():
            if stat_key in self.rules and value is not None:
                rule = self.rules[stat_key]
                points_per = rule["points"]
                total_points += value * points_per
        
        return round(total_points, 1)
    
    def validate_calculation(self, player_stats: PlayerMatchStats, known_points: float) -> float:
        """Validate calculated points against known fantasy points"""
        calculated = self.calculate_points(player_stats)
        error = abs(calculated - known_points)
        return error

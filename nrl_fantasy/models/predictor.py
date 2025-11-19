"""Prediction engine for NRL Fantasy player scores"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from nrl_fantasy.data.storage.models import Player, FantasyScore, PlayerMatchStats, Projection, Match
from datetime import datetime


class PlayerPredictor:
    """Predict future fantasy scores for players"""
    
    def __init__(self, db: Session, lookback_games: int = 5):
        self.db = db
        self.lookback_games = lookback_games
    
    def predict_next_round(self, player_id: int, season: int, next_round: int) -> Dict:
        """Generate prediction for a player's next round score"""
        
        # Get player
        player = self.db.query(Player).filter(Player.id == player_id).first()
        if not player:
            raise ValueError(f"Player {player_id} not found")
        
        # Get recent fantasy scores
        recent_scores = self.db.query(FantasyScore).filter(
            FantasyScore.player_id == player_id,
            FantasyScore.season == season,
            FantasyScore.round < next_round
        ).order_by(desc(FantasyScore.round)).limit(self.lookback_games).all()
        
        if not recent_scores:
            # No history - return conservative estimate
            return {
                "player_id": player_id,
                "predicted_points": 35.0,
                "confidence": 0.3,
                "method": "no_history",
                "features": {}
            }
        
        # Calculate rolling averages
        all_points = [score.fantasy_points for score in recent_scores]
        avg_all = sum(all_points) / len(all_points)
        
        # Get last 3 games average
        last_3_points = all_points[:3] if len(all_points) >= 3 else all_points
        avg_last_3 = sum(last_3_points) / len(last_3_points)
        
        # Weighted average (give more weight to recent games)
        weights = [0.4, 0.3, 0.2, 0.1] if len(all_points) >= 4 else [1.0 / len(all_points)] * len(all_points)
        weighted_points = sum(p * w for p, w in zip(all_points[:4], weights[:len(all_points)]))
        
        # Get average minutes played
        recent_stats = self.db.query(PlayerMatchStats).join(Match).filter(
            PlayerMatchStats.player_id == player_id,
            Match.season == season,
            Match.round < next_round
        ).order_by(desc(Match.round)).limit(self.lookback_games).all()
        
        avg_minutes = sum(s.minutes for s in recent_stats) / len(recent_stats) if recent_stats else 60
        
        # Adjust prediction based on minutes
        minutes_factor = min(1.0, avg_minutes / 70.0)  # Normalize to 70 minutes
        
        # Final prediction (weighted average with minutes adjustment)
        predicted_points = weighted_points * minutes_factor
        
        # Confidence based on consistency and data availability
        variance = sum((p - avg_all) ** 2 for p in all_points) / len(all_points)
        std_dev = variance ** 0.5
        
        # Higher consistency = higher confidence
        consistency_score = max(0.3, 1.0 - (std_dev / max(1, avg_all)))
        data_score = min(1.0, len(all_points) / self.lookback_games)
        confidence = (consistency_score * 0.7 + data_score * 0.3)
        
        return {
            "player_id": player_id,
            "predicted_points": round(predicted_points, 1),
            "confidence": round(confidence, 2),
            "method": "weighted_average",
            "features": {
                "avg_all_games": round(avg_all, 1),
                "avg_last_3": round(avg_last_3, 1),
                "avg_minutes": round(avg_minutes, 1),
                "games_analyzed": len(all_points),
                "std_dev": round(std_dev, 1)
            }
        }
    
    def save_projection(self, player_id: int, season: int, round_num: int, 
                       predicted_points: float, confidence: float, features: Dict) -> Projection:
        """Save projection to database"""
        projection = Projection(
            player_id=player_id,
            round=round_num,
            season=season,
            predicted_points=predicted_points,
            confidence=confidence,
            model_version="v1.0-weighted_avg",
            avg_last_3=features.get("avg_last_3"),
            avg_last_5=features.get("avg_all_games"),
            avg_minutes=features.get("avg_minutes")
        )
        self.db.add(projection)
        self.db.commit()
        return projection
    
    def generate_all_projections(self, season: int, next_round: int) -> int:
        """Generate projections for all active players"""
        players = self.db.query(Player).filter(Player.active == True).all()
        
        projections_created = 0
        for player in players:
            try:
                prediction = self.predict_next_round(player.id, season, next_round)
                self.save_projection(
                    player.id, season, next_round,
                    prediction["predicted_points"],
                    prediction["confidence"],
                    prediction["features"]
                )
                projections_created += 1
            except Exception as e:
                print(f"Error predicting for player {player.id}: {e}")
        
        return projections_created

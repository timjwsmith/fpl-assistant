"""Advanced prediction model with ML and contextual features"""
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import pickle
from pathlib import Path

from nrl_fantasy.data.storage.models import (
    Player, FantasyScore, PlayerMatchStats, Match, Projection
)


class AdvancedPredictor:
    """
    Advanced prediction engine with:
    - Opponent defensive strength analysis
    - Home/away venue adjustments
    - Machine learning (Gradient Boosting)
    - Historical trend analysis
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = Path("nrl_fantasy_ml_model.pkl")
    
    def calculate_team_defensive_strength(self, team: str, season: int, 
                                         position: str) -> float:
        """
        Calculate how many fantasy points a team concedes to a position
        
        Returns:
            Average fantasy points conceded (lower = stronger defense)
        """
        # Get all matches where team played
        matches = self.db.query(Match).filter(
            Match.season == season,
            (Match.home_team == team) | (Match.away_team == team),
            Match.completed == True
        ).all()
        
        if not matches:
            return 45.0  # League average
        
        total_points = 0
        count = 0
        
        for match in matches:
            # Get opponent team
            opponent_team = match.away_team if match.home_team == team else match.home_team
            
            # Get fantasy scores of opponent players in this position
            scores = self.db.query(FantasyScore).join(
                PlayerMatchStats
            ).join(Player).filter(
                FantasyScore.match_id == match.id,
                Player.team == opponent_team,
                Player.positions.like(f"%{position}%")
            ).all()
            
            for score in scores:
                total_points += score.fantasy_points
                count += 1
        
        if count == 0:
            return 45.0
        
        return total_points / count
    
    def get_venue_factor(self, team: str, venue: str, is_home: bool) -> float:
        """
        Calculate venue adjustment factor
        
        Returns:
            Multiplier (1.0 = no adjustment, >1.0 = advantage, <1.0 = disadvantage)
        """
        # Home ground advantage
        base_factor = 1.05 if is_home else 0.95
        
        # Venue-specific adjustments (could be learned from data)
        venue_adjustments = {
            'Penrith Stadium': {'Penrith Panthers': 1.08},
            'AAMI Park': {'Melbourne Storm': 1.07},
            'Suncorp Stadium': {'Brisbane Broncos': 1.06, 'Dolphins': 1.03},
            'Allianz Stadium': {'Sydney Roosters': 1.05},
        }
        
        if venue in venue_adjustments and team in venue_adjustments[venue]:
            base_factor *= venue_adjustments[venue][team]
        
        return base_factor
    
    def extract_features(self, player_id: int, season: int, next_round: int,
                        opponent: Optional[str] = None, is_home: Optional[bool] = None,
                        venue: Optional[str] = None) -> Dict:
        """
        Extract comprehensive features for ML prediction
        
        Returns:
            Dictionary of features
        """
        player = self.db.query(Player).filter(Player.id == player_id).first()
        
        # Get recent fantasy scores
        recent_scores = self.db.query(FantasyScore).filter(
            FantasyScore.player_id == player_id,
            FantasyScore.season == season,
            FantasyScore.round < next_round
        ).order_by(desc(FantasyScore.round)).limit(10).all()
        
        if not recent_scores:
            return self._get_default_features()
        
        # Basic stats
        all_points = [s.fantasy_points for s in recent_scores]
        features = {
            'avg_last_3': np.mean(all_points[:3]) if len(all_points) >= 3 else np.mean(all_points),
            'avg_last_5': np.mean(all_points[:5]) if len(all_points) >= 5 else np.mean(all_points),
            'avg_last_10': np.mean(all_points),
            'std_last_5': np.std(all_points[:5]) if len(all_points) >= 5 else np.std(all_points),
            'trend': self._calculate_trend(all_points),
            'consistency': 1.0 - (np.std(all_points) / max(1, np.mean(all_points)))
        }
        
        # Get recent match stats
        recent_stats = self.db.query(PlayerMatchStats).join(Match).filter(
            PlayerMatchStats.player_id == player_id,
            Match.season == season,
            Match.round < next_round
        ).order_by(desc(Match.round)).limit(5).all()
        
        if recent_stats:
            features['avg_minutes'] = np.mean([s.minutes for s in recent_stats])
            features['avg_tackles'] = np.mean([s.tackles for s in recent_stats])
            features['avg_run_metres'] = np.mean([s.run_metres for s in recent_stats])
            features['avg_tackle_breaks'] = np.mean([s.tackle_breaks for s in recent_stats])
            features['avg_errors'] = np.mean([s.errors for s in recent_stats])
        else:
            features.update({
                'avg_minutes': 60,
                'avg_tackles': 20,
                'avg_run_metres': 80,
                'avg_tackle_breaks': 3,
                'avg_errors': 1
            })
        
        # Opponent defensive strength
        if opponent and player:
            features['opponent_defense'] = self.calculate_team_defensive_strength(
                opponent, season, player.positions.split(',')[0]
            )
        else:
            features['opponent_defense'] = 45.0  # League average
        
        # Venue factor
        if is_home is not None and venue and player:
            features['venue_factor'] = self.get_venue_factor(player.team, venue, is_home)
        else:
            features['venue_factor'] = 1.0
        
        # Round context
        features['round_number'] = next_round
        features['is_early_season'] = 1 if next_round <= 5 else 0
        features['is_late_season'] = 1 if next_round >= 20 else 0
        
        return features
    
    def _get_default_features(self) -> Dict:
        """Default features for players with no history"""
        return {
            'avg_last_3': 35.0,
            'avg_last_5': 35.0,
            'avg_last_10': 35.0,
            'std_last_5': 10.0,
            'trend': 0.0,
            'consistency': 0.5,
            'avg_minutes': 60,
            'avg_tackles': 20,
            'avg_run_metres': 80,
            'avg_tackle_breaks': 3,
            'avg_errors': 1,
            'opponent_defense': 45.0,
            'venue_factor': 1.0,
            'round_number': 1,
            'is_early_season': 1,
            'is_late_season': 0
        }
    
    def _calculate_trend(self, scores: List[float]) -> float:
        """Calculate if player is trending up or down"""
        if len(scores) < 3:
            return 0.0
        
        # Simple linear trend
        x = np.arange(len(scores))
        y = np.array(scores)
        
        # Recent games weighted more
        weights = np.exp(-0.2 * x)
        
        weighted_avg_recent = np.average(scores[:3], weights=weights[:3])
        weighted_avg_older = np.average(scores[3:], weights=weights[3:]) if len(scores) > 3 else weighted_avg_recent
        
        return (weighted_avg_recent - weighted_avg_older) / max(1, weighted_avg_older)
    
    def train_model(self, season: int):
        """Train ML model on historical data"""
        print("Training ML model...")
        
        # Get all players with sufficient history
        players = self.db.query(Player).filter(Player.active == True).all()
        
        X_train = []
        y_train = []
        
        for player in players:
            # Get all fantasy scores for this season
            scores = self.db.query(FantasyScore).filter(
                FantasyScore.player_id == player.id,
                FantasyScore.season == season
            ).order_by(FantasyScore.round).all()
            
            # Need at least 10 games to train
            if len(scores) < 10:
                continue
            
            # For each round after round 5, predict using previous data
            for i in range(5, len(scores)):
                features = self.extract_features(player.id, season, scores[i].round)
                feature_vector = self._features_to_vector(features)
                
                X_train.append(feature_vector)
                y_train.append(scores[i].fantasy_points)
        
        if len(X_train) < 50:
            print("Not enough training data")
            return False
        
        X_train = np.array(X_train)
        y_train = np.array(y_train)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Save model
        self.save_model()
        
        # Calculate training accuracy
        predictions = self.model.predict(X_train_scaled)
        mae = np.mean(np.abs(predictions - y_train))
        print(f"✅ Model trained! MAE: {mae:.2f} points")
        
        return True
    
    def _features_to_vector(self, features: Dict) -> np.ndarray:
        """Convert feature dict to numpy array"""
        feature_order = [
            'avg_last_3', 'avg_last_5', 'avg_last_10', 'std_last_5',
            'trend', 'consistency', 'avg_minutes', 'avg_tackles',
            'avg_run_metres', 'avg_tackle_breaks', 'avg_errors',
            'opponent_defense', 'venue_factor', 'round_number',
            'is_early_season', 'is_late_season'
        ]
        
        return np.array([features.get(f, 0) for f in feature_order])
    
    def predict(self, player_id: int, season: int, next_round: int,
               opponent: Optional[str] = None, is_home: Optional[bool] = None,
               venue: Optional[str] = None) -> Dict:
        """Make ML prediction for player"""
        
        # Extract features
        features = self.extract_features(player_id, season, next_round, opponent, is_home, venue)
        
        # Use ML model if available
        if self.model:
            feature_vector = self._features_to_vector(features).reshape(1, -1)
            feature_vector_scaled = self.scaler.transform(feature_vector)
            predicted_points = self.model.predict(feature_vector_scaled)[0]
            confidence = min(0.95, features['consistency'])
        else:
            # Fallback to weighted average
            predicted_points = features['avg_last_3'] * 0.5 + features['avg_last_5'] * 0.3 + features['avg_last_10'] * 0.2
            
            # Apply venue factor
            predicted_points *= features['venue_factor']
            
            # Adjust for opponent defense (if easier opponent, predict higher)
            if features['opponent_defense'] > 50:  # Weak defense
                predicted_points *= 1.05
            elif features['opponent_defense'] < 40:  # Strong defense
                predicted_points *= 0.95
            
            confidence = features['consistency'] * 0.8
        
        return {
            'predicted_points': round(predicted_points, 1),
            'confidence': round(confidence, 2),
            'features': features,
            'opponent': opponent,
            'is_home': is_home
        }
    
    def save_model(self):
        """Save trained model to disk"""
        if self.model:
            with open(self.model_path, 'wb') as f:
                pickle.dump({'model': self.model, 'scaler': self.scaler}, f)
    
    def load_model(self):
        """Load trained model from disk"""
        if self.model_path.exists():
            with open(self.model_path, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.scaler = data['scaler']
            return True
        return False


if __name__ == "__main__":
    from nrl_fantasy.data.storage.database import get_db
    
    with get_db() as db:
        predictor = AdvancedPredictor(db)
        predictor.train_model(2024)

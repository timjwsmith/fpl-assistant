"""Team optimization for captain selection and trade suggestions"""
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_
from nrl_fantasy.data.storage.models import Player, Projection, FantasyPriceHistory


class TeamOptimizer:
    """Optimize team selection and suggest trades"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def suggest_captain(self, player_ids: List[int], season: int, 
                       round_num: int) -> Tuple[Dict, Dict]:
        """Suggest best captain and vice-captain from team"""
        
        # Get projections for all players in team
        projections = self.db.query(Projection, Player).join(Player).filter(
            and_(
                Projection.player_id.in_(player_ids),
                Projection.season == season,
                Projection.round == round_num
            )
        ).all()
        
        if not projections:
            return None, None
        
        # Score each player: predicted_points * confidence
        scored_players = []
        for proj, player in projections:
            score = proj.predicted_points * proj.confidence
            scored_players.append({
                "player_id": player.id,
                "player_name": player.name,
                "predicted_points": proj.predicted_points,
                "confidence": proj.confidence,
                "score": score,
                "reason": self._generate_captain_reason(proj, player)
            })
        
        # Sort by score descending
        scored_players.sort(key=lambda x: x["score"], reverse=True)
        
        captain = scored_players[0] if len(scored_players) > 0 else None
        vice_captain = scored_players[1] if len(scored_players) > 1 else None
        
        return captain, vice_captain
    
    def _generate_captain_reason(self, projection: Projection, player: Player) -> str:
        """Generate explanation for captain suggestion"""
        reasons = []
        
        if projection.predicted_points > 60:
            reasons.append("high scoring potential")
        
        if projection.confidence > 0.7:
            reasons.append("consistent form")
        
        if projection.avg_minutes and projection.avg_minutes > 70:
            reasons.append("plays big minutes")
        
        if projection.avg_last_3 and projection.avg_last_3 > 55:
            reasons.append("strong recent form")
        
        if not reasons:
            reasons.append("solid all-around option")
        
        return f"{player.team} star with {', '.join(reasons)}"
    
    def suggest_trades(self, current_squad: List[int], bank_balance: float,
                      season: int, round_num: int, limit: int = 5) -> List[Dict]:
        """Suggest trade-in and trade-out candidates"""
        
        # Get projections for current squad
        squad_projections = self.db.query(Projection, Player, FantasyPriceHistory).join(
            Player
        ).outerjoin(
            FantasyPriceHistory,
            and_(
                FantasyPriceHistory.player_id == Player.id,
                FantasyPriceHistory.season == season,
                FantasyPriceHistory.round == round_num - 1  # Last round's price
            )
        ).filter(
            Projection.player_id.in_(current_squad),
            Projection.season == season,
            Projection.round == round_num
        ).all()
        
        # Get all available players (not in squad)
        available_projections = self.db.query(Projection, Player, FantasyPriceHistory).join(
            Player
        ).outerjoin(
            FantasyPriceHistory,
            and_(
                FantasyPriceHistory.player_id == Player.id,
                FantasyPriceHistory.season == season,
                FantasyPriceHistory.round == round_num - 1
            )
        ).filter(
            ~Projection.player_id.in_(current_squad),
            Projection.season == season,
            Projection.round == round_num
        ).all()
        
        # Calculate value scores (points per 100k)
        def calc_value(proj, price_hist):
            price = price_hist.price if price_hist else 400  # Default price
            return (proj.predicted_points / max(1, price)) * 100
        
        # Find underperformers in squad
        squad_values = []
        for proj, player, price_hist in squad_projections:
            value = calc_value(proj, price_hist)
            squad_values.append({
                "player_id": player.id,
                "name": player.name,
                "team": player.team,
                "position": player.positions,
                "predicted_points": proj.predicted_points,
                "price": price_hist.price if price_hist else 400,
                "value": value
            })
        
        squad_values.sort(key=lambda x: x["value"])
        
        # Find best value picks available
        available_values = []
        for proj, player, price_hist in available_projections:
            value = calc_value(proj, price_hist)
            price = price_hist.price if price_hist else 400
            
            # Only consider affordable players
            if price <= bank_balance + 100:  # Allow slight overspend (selling player first)
                available_values.append({
                    "player_id": player.id,
                    "name": player.name,
                    "team": player.team,
                    "position": player.positions,
                    "predicted_points": proj.predicted_points,
                    "price": price,
                    "value": value
                })
        
        available_values.sort(key=lambda x: x["value"], reverse=True)
        
        # Generate trade suggestions
        trade_suggestions = []
        for trade_out in squad_values[:3]:  # Bottom 3 performers
            for trade_in in available_values[:10]:  # Top 10 available
                # Check if it's a good trade (value improvement)
                value_gain = trade_in["value"] - trade_out["value"]
                points_gain = trade_in["predicted_points"] - trade_out["predicted_points"]
                
                if value_gain > 0.5 or points_gain > 10:
                    trade_suggestions.append({
                        "trade_out_id": trade_out["player_id"],
                        "trade_out_name": trade_out["name"],
                        "trade_in_id": trade_in["player_id"],
                        "trade_in_name": trade_in["name"],
                        "projected_gain": round(points_gain, 1),
                        "price_difference": trade_in["price"] - trade_out["price"],
                        "reason": self._generate_trade_reason(trade_out, trade_in, value_gain, points_gain)
                    })
        
        # Sort by projected gain
        trade_suggestions.sort(key=lambda x: x["projected_gain"], reverse=True)
        
        return trade_suggestions[:limit]
    
    def _generate_trade_reason(self, trade_out: Dict, trade_in: Dict, 
                               value_gain: float, points_gain: float) -> str:
        """Generate explanation for trade suggestion"""
        reasons = []
        
        if points_gain > 15:
            reasons.append(f"+{points_gain:.1f} projected points")
        elif points_gain > 0:
            reasons.append(f"+{points_gain:.1f} pts")
        
        if value_gain > 1.0:
            reasons.append("excellent value")
        elif value_gain > 0.5:
            reasons.append("good value")
        
        if trade_in["predicted_points"] > 60:
            reasons.append("premium scorer")
        
        if not reasons:
            reasons.append("strategic upgrade")
        
        return ", ".join(reasons)
    
    def calculate_team_projection(self, player_ids: List[int], season: int, 
                                 round_num: int) -> float:
        """Calculate total projected points for a team"""
        projections = self.db.query(Projection).filter(
            and_(
                Projection.player_id.in_(player_ids),
                Projection.season == season,
                Projection.round == round_num
            )
        ).all()
        
        total = sum(p.predicted_points for p in projections)
        return round(total, 1)

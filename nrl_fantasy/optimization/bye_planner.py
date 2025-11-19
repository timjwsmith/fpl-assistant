"""Multi-week bye round planning optimizer"""
from typing import Dict, List
from sqlalchemy.orm import Session
from nrl_fantasy.data.storage.models import Player, Projection


class ByePlanner:
    """
    Plan trades across multiple rounds to optimize bye coverage
    
    NRL Fantasy bye rounds typically occur in rounds 13-17 where
    teams have scheduled breaks
    """
    
    def __init__(self, db: Session):
        self.db = db
        
        # Standard NRL bye schedule (example for 2024)
        self.bye_schedule = {
            13: ['Penrith Panthers', 'Melbourne Storm', 'Brisbane Broncos', 'Cronulla Sharks'],
            14: ['Sydney Roosters', 'Parramatta Eels', 'South Sydney Rabbitohs', 'Manly Sea Eagles'],
            15: ['Newcastle Knights', 'North Queensland Cowboys', 'Canberra Raiders', 'New Zealand Warriors'],
            16: ['Gold Coast Titans', 'St George Illawarra Dragons'],
            17: ['Canterbury Bulldogs', 'Wests Tigers']
        }
    
    def get_team_bye_round(self, team: str) -> int:
        """Get which round a team has their bye"""
        for round_num, teams in self.bye_schedule.items():
            if team in teams:
                return round_num
        return 0  # No bye
    
    def analyze_squad_bye_coverage(self, squad: List[int], season: int) -> Dict:
        """
        Analyze how many players are on bye each round
        
        Returns:
            Dictionary with bye analysis
        """
        players = self.db.query(Player).filter(Player.id.in_(squad)).all()
        
        bye_distribution = {}
        for round_num in range(13, 18):
            bye_distribution[round_num] = {
                'teams_on_bye': self.bye_schedule.get(round_num, []),
                'players_on_bye': [],
                'players_available': []
            }
        
        for player in players:
            bye_round = self.get_team_bye_round(player.team)
            if bye_round > 0:
                bye_distribution[bye_round]['players_on_bye'].append({
                    'id': player.id,
                    'name': player.name,
                    'team': player.team,
                    'position': player.positions
                })
            
            # Mark as available in other rounds
            for round_num in range(13, 18):
                if round_num != bye_round:
                    bye_distribution[round_num]['players_available'].append(player.id)
        
        return bye_distribution
    
    def suggest_bye_trades(self, squad: List[int], season: int, 
                          trades_available: int = 10) -> List[Dict]:
        """
        Suggest optimal trades to minimize bye round impact
        
        Strategy:
        1. Identify rounds with most players on bye
        2. Trade out bye players for active players in that round
        3. Prioritize high-value trades
        
        Returns:
            List of trade suggestions with timing
        """
        bye_analysis = self.analyze_squad_bye_coverage(squad, season)
        
        # Find rounds with most players on bye
        critical_rounds = sorted(
            bye_analysis.items(),
            key=lambda x: len(x[1]['players_on_bye']),
            reverse=True
        )
        
        trade_suggestions = []
        trades_used = 0
        
        for round_num, round_data in critical_rounds:
            players_on_bye = round_data['players_on_bye']
            
            if len(players_on_bye) <= 2:
                # Can manage with bench, no trades needed
                continue
            
            # Need to trade out bye players
            for bye_player in players_on_bye[:min(2, len(players_on_bye))]:
                if trades_used >= trades_available:
                    break
                
                # Find replacement from teams not on bye
                active_teams = [t for t in self._get_all_teams() 
                              if t not in round_data['teams_on_bye']]
                
                # Get best available player from active teams in same position
                replacement = self._find_replacement(
                    bye_player['position'], 
                    active_teams, 
                    season, 
                    round_num
                )
                
                if replacement:
                    trade_suggestions.append({
                        'round': round_num - 1,  # Trade before bye round
                        'trade_out': {
                            'id': bye_player['id'],
                            'name': bye_player['name'],
                            'team': bye_player['team'],
                            'bye_round': round_num
                        },
                        'trade_in': replacement,
                        'reason': f"Avoid {len(players_on_bye)} players on bye in round {round_num}",
                        'priority': 'high' if len(players_on_bye) > 3 else 'medium'
                    })
                    trades_used += 1
        
        return trade_suggestions
    
    def _get_all_teams(self) -> List[str]:
        """Get list of all NRL teams"""
        return [
            'Penrith Panthers', 'Melbourne Storm', 'Brisbane Broncos', 'Sydney Roosters',
            'Parramatta Eels', 'Cronulla Sharks', 'South Sydney Rabbitohs', 'Manly Sea Eagles',
            'Newcastle Knights', 'North Queensland Cowboys', 'Canberra Raiders', 'New Zealand Warriors',
            'Gold Coast Titans', 'St George Illawarra Dragons', 'Canterbury Bulldogs', 'Wests Tigers'
        ]
    
    def _find_replacement(self, position: str, active_teams: List[str], 
                         season: int, round_num: int) -> Dict:
        """Find best replacement player from active teams"""
        # Get projections for players from active teams
        players = self.db.query(Player, Projection).join(Projection).filter(
            Player.team.in_(active_teams),
            Player.positions.like(f"%{position}%"),
            Projection.season == season,
            Projection.round == round_num
        ).order_by(Projection.predicted_points.desc()).limit(5).all()
        
        if not players:
            return None
        
        # Return best option
        player, proj = players[0]
        return {
            'id': player.id,
            'name': player.name,
            'team': player.team,
            'position': player.positions,
            'predicted_points': proj.predicted_points,
            'confidence': proj.confidence
        }
    
    def create_multi_week_plan(self, squad: List[int], season: int, 
                              current_round: int, horizon: int = 8) -> Dict:
        """
        Create comprehensive multi-week trading and bye plan
        
        Args:
            squad: Current squad player IDs
            season: Season year
            current_round: Current round number
            horizon: How many rounds to plan ahead
            
        Returns:
            Multi-week plan with trade timing and rationale
        """
        plan = {
            'current_round': current_round,
            'planning_horizon': horizon,
            'bye_analysis': {},
            'recommended_trades': [],
            'alternative_strategies': []
        }
        
        # Analyze bye coverage
        bye_analysis = self.analyze_squad_bye_coverage(squad, season)
        plan['bye_analysis'] = bye_analysis
        
        # Get trade suggestions
        trades = self.suggest_bye_trades(squad, season)
        plan['recommended_trades'] = trades
        
        # Calculate impact
        total_bye_players = sum(len(r['players_on_bye']) for r in bye_analysis.values())
        plan['total_bye_impact'] = total_bye_players
        
        # Alternative strategy: use loophole or boost trades
        if total_bye_players > 8:
            plan['alternative_strategies'].append({
                'strategy': 'aggressive_trading',
                'description': 'Consider using more trades to minimize bye impact',
                'trades_recommended': len(trades) + 2
            })
        
        return plan


if __name__ == "__main__":
    from nrl_fantasy.data.storage.database import get_db
    
    with get_db() as db:
        planner = ByePlanner(db)
        
        # Example squad
        sample_squad = list(range(1, 18))
        
        plan = planner.create_multi_week_plan(sample_squad, 2024, 10)
        print(f"Bye planning for squad:")
        print(f"Total players affected by byes: {plan['total_bye_impact']}")
        print(f"Recommended trades: {len(plan['recommended_trades'])}")

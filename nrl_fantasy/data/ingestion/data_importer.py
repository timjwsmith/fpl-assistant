"""Import external NRL data into the database"""
from typing import Dict, List
from sqlalchemy.orm import Session
from datetime import datetime

from nrl_fantasy.data.storage.models import (
    Player, Match, PlayerMatchStats, FantasyScore
)
from nrl_fantasy.data.ingestion.nrl_data_fetcher import NRLDataFetcher
from nrl_fantasy.scoring.engine import ScoringEngine


class DataImporter:
    """Import external NRL data into database"""
    
    def __init__(self, db: Session):
        self.db = db
        self.scoring_engine = ScoringEngine(db)
    
    def import_players_from_stats(self, player_stats: List[Dict]) -> Dict[str, Player]:
        """
        Create player records from stat data
        
        Returns:
            Dictionary mapping player names to Player objects
        """
        players_map = {}
        
        for stat in player_stats:
            player_name = stat.get('player_name') or stat.get('name')
            if not player_name:
                continue
            
            # Check if player already exists
            if player_name in players_map:
                continue
            
            existing = self.db.query(Player).filter(Player.name == player_name).first()
            if existing:
                players_map[player_name] = existing
                continue
            
            # Create new player
            player = Player(
                name=player_name,
                team=stat.get('team', 'Unknown'),
                positions=stat.get('position', 'UNK'),
                nrl_id=stat.get('player_id'),
                active=True
            )
            self.db.add(player)
            players_map[player_name] = player
        
        self.db.commit()
        print(f"Imported {len(players_map)} players")
        return players_map
    
    def import_matches(self, match_data: List[Dict], season: int) -> Dict[str, Match]:
        """
        Import match records
        
        Returns:
            Dictionary mapping match identifiers to Match objects
        """
        matches_map = {}
        
        for match_info in match_data:
            match_id_key = f"{season}_{match_info.get('round')}_{match_info.get('home_team')}_{match_info.get('away_team')}"
            
            # Check if match exists
            existing = self.db.query(Match).filter(
                Match.season == season,
                Match.round == int(match_info.get('round', 0)),
                Match.home_team == match_info.get('home_team'),
                Match.away_team == match_info.get('away_team')
            ).first()
            
            if existing:
                matches_map[match_id_key] = existing
                continue
            
            # Parse date
            match_date = datetime.now()
            if 'date' in match_info:
                try:
                    match_date = datetime.fromisoformat(match_info['date'])
                except:
                    pass
            
            # Create match
            match = Match(
                season=season,
                round=int(match_info.get('round', 0)),
                date=match_date,
                home_team=match_info.get('home_team', 'Unknown'),
                away_team=match_info.get('away_team', 'Unknown'),
                venue=match_info.get('venue'),
                home_score=match_info.get('home_score'),
                away_score=match_info.get('away_score'),
                completed=True
            )
            self.db.add(match)
            matches_map[match_id_key] = match
        
        self.db.commit()
        print(f"Imported {len(matches_map)} matches")
        return matches_map
    
    def import_player_stats(self, stats_data: List[Dict], season: int, 
                          players_map: Dict[str, Player], 
                          matches_map: Dict[str, Match]):
        """Import player match statistics and calculate fantasy scores"""
        
        stats_imported = 0
        scores_calculated = 0
        
        for stat in stats_data:
            player_name = stat.get('player_name') or stat.get('name')
            if not player_name or player_name not in players_map:
                continue
            
            player = players_map[player_name]
            
            # Find corresponding match
            round_num = stat.get('round', 0)
            team = stat.get('team')
            
            # Find match where this player's team played
            match = None
            for match_obj in matches_map.values():
                if match_obj.round == round_num and (
                    match_obj.home_team == team or match_obj.away_team == team
                ):
                    match = match_obj
                    break
            
            if not match:
                continue
            
            # Check if stats already exist
            existing = self.db.query(PlayerMatchStats).filter(
                PlayerMatchStats.player_id == player.id,
                PlayerMatchStats.match_id == match.id
            ).first()
            
            if existing:
                continue
            
            # Create player match stats
            player_stats = PlayerMatchStats(
                player_id=player.id,
                match_id=match.id,
                minutes=stat.get('minutes', 0),
                tries=stat.get('tries', 0),
                try_assists=stat.get('try_assists', 0),
                linebreak_assists=stat.get('linebreak_assists', 0),
                line_breaks=stat.get('line_breaks', 0),
                runs=stat.get('runs', 0),
                run_metres=stat.get('run_metres', 0) or stat.get('metres', 0),
                tackle_breaks=stat.get('tackle_breaks', 0),
                tackles=stat.get('tackles', 0),
                missed_tackles=stat.get('missed_tackles', 0),
                offloads=stat.get('offloads', 0),
                errors=stat.get('errors', 0),
                penalties_conceded=stat.get('penalties', 0) or stat.get('penalties_conceded', 0),
                kick_metres=stat.get('kick_metres', 0),
                forced_dropouts=stat.get('forced_dropouts', 0),
                intercepts=stat.get('intercepts', 0)
            )
            self.db.add(player_stats)
            stats_imported += 1
            
            # Calculate fantasy score
            fantasy_points = self.scoring_engine.calculate_points(player_stats)
            
            fantasy_score = FantasyScore(
                player_id=player.id,
                match_id=match.id,
                round=match.round,
                season=season,
                fantasy_points=fantasy_points,
                calculated_points=fantasy_points,
                error_margin=0.0
            )
            self.db.add(fantasy_score)
            scores_calculated += 1
        
        self.db.commit()
        print(f"Imported {stats_imported} player stats")
        print(f"Calculated {scores_calculated} fantasy scores")
    
    def import_season(self, season: int):
        """Import all data for a complete season"""
        print(f"\nImporting season {season}...")
        
        # Fetch data
        fetcher = NRLDataFetcher()
        player_stats = fetcher.fetch_player_stats(season)
        matches = fetcher.fetch_match_results(season)
        
        if not player_stats and not matches:
            print(f"No data available for season {season} from NRL-Data repository")
            print("This is expected - repository may not have this season's data yet")
            return
        
        # Import in order
        players_map = self.import_players_from_stats(player_stats)
        matches_map = self.import_matches(matches, season)
        self.import_player_stats(player_stats, season, players_map, matches_map)
        
        print(f"✅ Season {season} import complete!")


def run_import(db: Session, seasons: List[int] = [2023, 2024]):
    """Run data import for specified seasons"""
    importer = DataImporter(db)
    
    for season in seasons:
        try:
            importer.import_season(season)
        except Exception as e:
            print(f"Error importing season {season}: {e}")
            continue


if __name__ == "__main__":
    from nrl_fantasy.data.storage.database import get_db
    
    with get_db() as db:
        run_import(db, [2023, 2024])

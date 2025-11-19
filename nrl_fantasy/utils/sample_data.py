"""Generate sample NRL data for MVP testing"""
from datetime import datetime, timedelta
from nrl_fantasy.data.storage.database import get_db
from nrl_fantasy.data.storage.models import Player, Match, PlayerMatchStats, FantasyScore, FantasyPriceHistory
import random


def create_sample_teams_and_players():
    """Create sample NRL teams and players"""
    teams = [
        "Penrith Panthers", "Melbourne Storm", "Brisbane Broncos", "Sydney Roosters",
        "Parramatta Eels", "Cronulla Sharks", "South Sydney Rabbitohs", "Manly Sea Eagles",
        "Newcastle Knights", "North Queensland Cowboys", "Canberra Raiders", "New Zealand Warriors",
        "Gold Coast Titans", "St George Illawarra Dragons", "Canterbury Bulldogs", "Wests Tigers"
    ]
    
    positions_pool = ["FRF", "HOK", "2RF", "HLF", "CTW", "FLB"]
    
    players_by_team = []
    player_id = 1
    
    for team in teams:
        # Create 8 players per team for sample data
        for i in range(8):
            position = random.choice(positions_pool)
            first_names = ["James", "Nathan", "Kalyn", "Ryan", "Tom", "Cameron", "Latrell", "Josh", 
                         "Harry", "Dylan", "Nicho", "Jahrome", "Reece", "Sam", "Jack", "Mitchell"]
            last_names = ["Tedesco", "Cleary", "Ponga", "Papenhuyzen", "Trbojevic", "Munster", 
                        "Mitchell", "Haas", "Grant", "Edwards", "Hynes", "Hughes", "Walsh", "Walker",
                        "Wighton", "Moses"]
            
            name = f"{random.choice(first_names)} {random.choice(last_names)}{i}"
            
            players_by_team.append({
                "id": player_id,
                "nrl_id": f"NRL{player_id:05d}",
                "fantasy_id": f"FAN{player_id:05d}",
                "name": name,
                "team": team,
                "positions": position,
                "active": True
            })
            player_id += 1
    
    return teams, players_by_team


def generate_realistic_stats(position):
    """Generate realistic player match stats based on position"""
    base_stats = {
        "minutes": random.randint(40, 80),
        "tries": 0,
        "try_assists": 0,
        "linebreak_assists": 0,
        "line_breaks": 0,
        "runs": 0,
        "run_metres": 0,
        "post_contact_metres": 0,
        "tackle_breaks": 0,
        "tackles": 0,
        "missed_tackles": 0,
        "offloads": 0,
        "errors": random.randint(0, 2),
        "penalties_conceded": random.randint(0, 1),
        "sin_bins": 0,
        "send_offs": 0,
        "kicks": 0,
        "kick_metres": 0,
        "forced_dropouts": 0,
        "intercepts": 0
    }
    
    # Position-specific stats
    if position in ["FRF", "2RF"]:  # Forwards
        base_stats["runs"] = random.randint(8, 18)
        base_stats["run_metres"] = random.randint(80, 180)
        base_stats["post_contact_metres"] = random.randint(30, 80)
        base_stats["tackles"] = random.randint(25, 45)
        base_stats["missed_tackles"] = random.randint(0, 4)
        base_stats["offloads"] = random.randint(0, 3)
        base_stats["tackle_breaks"] = random.randint(1, 5)
        base_stats["tries"] = 1 if random.random() > 0.85 else 0
        
    elif position == "HOK":  # Hooker
        base_stats["runs"] = random.randint(10, 20)
        base_stats["run_metres"] = random.randint(60, 120)
        base_stats["tackles"] = random.randint(30, 50)
        base_stats["missed_tackles"] = random.randint(1, 5)
        base_stats["try_assists"] = 1 if random.random() > 0.7 else 0
        base_stats["linebreak_assists"] = 1 if random.random() > 0.8 else 0
        base_stats["tries"] = 1 if random.random() > 0.9 else 0
        
    elif position == "HLF":  # Halfback/Five-Eighth
        base_stats["runs"] = random.randint(8, 15)
        base_stats["run_metres"] = random.randint(50, 100)
        base_stats["tackles"] = random.randint(20, 35)
        base_stats["kicks"] = random.randint(8, 20)
        base_stats["kick_metres"] = random.randint(200, 450)
        base_stats["try_assists"] = random.randint(0, 2)
        base_stats["linebreak_assists"] = random.randint(0, 2)
        base_stats["line_breaks"] = 1 if random.random() > 0.8 else 0
        base_stats["tries"] = 1 if random.random() > 0.85 else 0
        base_stats["forced_dropouts"] = random.randint(0, 2)
        
    elif position == "CTW":  # Centre/Winger
        base_stats["runs"] = random.randint(10, 18)
        base_stats["run_metres"] = random.randint(70, 150)
        base_stats["tackles"] = random.randint(15, 30)
        base_stats["line_breaks"] = random.randint(0, 2)
        base_stats["tackle_breaks"] = random.randint(2, 6)
        base_stats["tries"] = random.randint(0, 2)
        base_stats["try_assists"] = 1 if random.random() > 0.8 else 0
        
    elif position == "FLB":  # Fullback
        base_stats["runs"] = random.randint(12, 20)
        base_stats["run_metres"] = random.randint(100, 200)
        base_stats["tackles"] = random.randint(20, 35)
        base_stats["line_breaks"] = random.randint(0, 2)
        base_stats["tackle_breaks"] = random.randint(3, 8)
        base_stats["try_assists"] = random.randint(0, 2)
        base_stats["linebreak_assists"] = random.randint(0, 2)
        base_stats["tries"] = random.randint(0, 2)
    
    return base_stats


def calculate_fantasy_points(stats):
    """Calculate fantasy points based on stats (using 2024 rules)"""
    points = 0.0
    
    # Positive stats
    points += stats["tries"] * 4
    points += stats["try_assists"] * 4
    points += stats["linebreak_assists"] * 2
    points += stats["line_breaks"] * 4
    points += stats["run_metres"] * 0.1
    points += stats["tackle_breaks"] * 1
    points += stats["tackles"] * 1
    points += stats["offloads"] * 1
    points += stats["kick_metres"] * 0.033
    points += stats["forced_dropouts"] * 1
    points += stats["intercepts"] * 4
    
    # Negative stats
    points += stats["missed_tackles"] * -1
    points += stats["errors"] * -3
    points += stats["penalties_conceded"] * -3
    points += stats["sin_bins"] * -10
    points += stats["send_offs"] * -20
    
    return round(points, 1)


def seed_sample_data():
    """Seed database with sample NRL data"""
    print("🏉 Generating sample NRL data...")
    
    teams, players = create_sample_teams_and_players()
    season = 2024
    current_round = 5
    
    with get_db() as db:
        # Create players
        print(f"Creating {len(players)} players...")
        player_objects = []
        for p_data in players:
            player = Player(**p_data)
            db.add(player)
            player_objects.append(player)
        db.commit()
        
        # Create matches for rounds 1-5
        print("Creating matches for rounds 1-5...")
        matches = []
        match_id = 1
        
        for round_num in range(1, current_round + 1):
            # Create 8 matches per round (16 teams)
            round_teams = teams.copy()
            random.shuffle(round_teams)
            
            for i in range(0, len(round_teams), 2):
                match_date = datetime(2024, 3, 1) + timedelta(days=(round_num - 1) * 7 + i // 2)
                match = Match(
                    id=match_id,
                    season=season,
                    round=round_num,
                    date=match_date,
                    home_team=round_teams[i],
                    away_team=round_teams[i + 1],
                    venue=f"{round_teams[i]} Stadium",
                    home_score=random.randint(10, 40),
                    away_score=random.randint(10, 40),
                    completed=True
                )
                db.add(match)
                matches.append(match)
                match_id += 1
        
        db.commit()
        
        # Create player match stats and fantasy scores
        print("Generating player stats and fantasy scores...")
        stats_created = 0
        
        for match in matches:
            # Get players from both teams
            home_players = [p for p in player_objects if p.team == match.home_team][:4]  # Sample 4 players
            away_players = [p for p in player_objects if p.team == match.away_team][:4]
            
            for player in home_players + away_players:
                # Generate stats
                stats = generate_realistic_stats(player.positions)
                
                # Create PlayerMatchStats
                player_stats = PlayerMatchStats(
                    player_id=player.id,
                    match_id=match.id,
                    **stats
                )
                db.add(player_stats)
                
                # Calculate and create FantasyScore
                fantasy_points = calculate_fantasy_points(stats)
                fantasy_score = FantasyScore(
                    player_id=player.id,
                    match_id=match.id,
                    round=match.round,
                    season=season,
                    fantasy_points=fantasy_points,
                    calculated_points=fantasy_points,
                    error_margin=0.0
                )
                db.add(fantasy_score)
                stats_created += 1
        
        db.commit()
        
        # Create price history
        print("Creating price history...")
        for round_num in range(1, current_round + 1):
            for player in player_objects:
                # Base price with some variation
                base_price = random.randint(300, 700)  # Price in thousands
                price = base_price + (round_num - 1) * random.randint(-10, 15)
                
                price_history = FantasyPriceHistory(
                    player_id=player.id,
                    round=round_num,
                    season=season,
                    price=max(200, price),  # Min price 200k
                    price_change=random.randint(-15, 15) if round_num > 1 else 0,
                    breakeven=random.randint(30, 60),
                    ownership_pct=random.uniform(0.5, 25.0)
                )
                db.add(price_history)
        
        db.commit()
        
        print(f"✅ Sample data created successfully!")
        print(f"   - {len(players)} players")
        print(f"   - {len(matches)} matches")
        print(f"   - {stats_created} player match stats")
        print(f"   - {len(players) * current_round} price history records")


if __name__ == "__main__":
    seed_sample_data()

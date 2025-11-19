"""Initialize database and seed with NRL Fantasy scoring rules"""
from nrl_fantasy.data.storage.database import init_db, get_db
from nrl_fantasy.data.storage.models import FantasyScoringRule


def seed_scoring_rules():
    """Seed database with 2024 NRL Fantasy scoring rules"""
    rules_2024 = [
        # Positive stats
        {"season": 2024, "stat_key": "tries", "points": 4.0, "formula_type": "flat", 
         "description": "4 points per try"},
        {"season": 2024, "stat_key": "try_assists", "points": 4.0, "formula_type": "flat",
         "description": "4 points per try assist"},
        {"season": 2024, "stat_key": "linebreak_assists", "points": 2.0, "formula_type": "flat",
         "description": "2 points per linebreak assist"},
        {"season": 2024, "stat_key": "line_breaks", "points": 4.0, "formula_type": "flat",
         "description": "4 points per line break"},
        {"season": 2024, "stat_key": "run_metres", "points": 0.1, "formula_type": "per_1",
         "description": "1 point per 10 run metres"},
        {"season": 2024, "stat_key": "tackle_breaks", "points": 1.0, "formula_type": "flat",
         "description": "1 point per tackle break"},
        {"season": 2024, "stat_key": "tackles", "points": 1.0, "formula_type": "flat",
         "description": "1 point per tackle"},
        {"season": 2024, "stat_key": "offloads", "points": 1.0, "formula_type": "flat",
         "description": "1 point per offload"},
        {"season": 2024, "stat_key": "kick_metres", "points": 0.033, "formula_type": "per_1",
         "description": "1 point per 30 kick metres"},
        {"season": 2024, "stat_key": "forced_dropouts", "points": 1.0, "formula_type": "flat",
         "description": "1 point per forced dropout"},
        {"season": 2024, "stat_key": "intercepts", "points": 4.0, "formula_type": "flat",
         "description": "4 points per intercept"},
        
        # Negative stats
        {"season": 2024, "stat_key": "missed_tackles", "points": -1.0, "formula_type": "flat",
         "description": "-1 point per missed tackle"},
        {"season": 2024, "stat_key": "errors", "points": -3.0, "formula_type": "flat",
         "description": "-3 points per error"},
        {"season": 2024, "stat_key": "penalties_conceded", "points": -3.0, "formula_type": "flat",
         "description": "-3 points per penalty conceded"},
        {"season": 2024, "stat_key": "sin_bins", "points": -10.0, "formula_type": "flat",
         "description": "-10 points per sin bin"},
        {"season": 2024, "stat_key": "send_offs", "points": -20.0, "formula_type": "flat",
         "description": "-20 points per send off"},
    ]
    
    with get_db() as db:
        for rule_data in rules_2024:
            rule = FantasyScoringRule(**rule_data)
            db.add(rule)
        
        print(f"✅ Seeded {len(rules_2024)} scoring rules for 2024 season")


if __name__ == "__main__":
    print("Initializing NRL Fantasy database...")
    init_db()
    print("\nSeeding scoring rules...")
    seed_scoring_rules()
    print("\n✅ Database setup complete!")

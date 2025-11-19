"""
Example Usage: Team Sync Service

This script demonstrates how to use the TeamSyncService to import
NRL Fantasy squads into the database.

Run this script:
    python -m nrl_fantasy.integrations.team_sync_example
"""

import os
from nrl_fantasy.data.storage.database import get_db, init_db
from nrl_fantasy.integrations import TeamSyncService


def example_full_sync():
    """
    Example: Perform a complete sync for a user.
    
    This syncs:
    - User account
    - All fantasy teams
    - Squad composition for each team
    """
    print("\n" + "="*70)
    print(" "*20 + "Team Sync Service Example")
    print(" "*25 + "Full Sync")
    print("="*70 + "\n")
    
    # Get credentials from environment
    username = os.getenv("NRL_FANTASY_USERNAME")
    password = os.getenv("NRL_FANTASY_PASSWORD")
    
    if not username or not password:
        print("⚠️  Credentials not found!")
        print("   Please set environment variables:")
        print("   - NRL_FANTASY_USERNAME")
        print("   - NRL_FANTASY_PASSWORD")
        return
    
    # Ensure database is initialized
    print("Initializing database...")
    init_db()
    print("✓ Database ready\n")
    
    # Perform full sync using context manager
    with get_db() as db:
        sync_service = TeamSyncService(db)
        
        print(f"Starting full sync for: {username}")
        print("-" * 70)
        
        summary = sync_service.full_sync(username, password)
        
        print("\n" + "="*70)
        print("Sync Summary")
        print("="*70)
        print(f"Status: {'✓ SUCCESS' if summary['success'] else '✗ FAILED'}")
        print(f"User ID: {summary['user_id']}")
        print(f"Teams Synced: {summary['teams_synced']}")
        print(f"Players Synced: {summary['players_synced']}")
        
        if summary['errors']:
            print(f"\nErrors ({len(summary['errors'])}):")
            for error in summary['errors']:
                print(f"  - {error}")
        
        print("="*70 + "\n")


def example_step_by_step_sync():
    """
    Example: Perform sync step-by-step with more control.
    
    This demonstrates individual sync methods.
    """
    print("\n" + "="*70)
    print(" "*20 + "Team Sync Service Example")
    print(" "*22 + "Step-by-Step Sync")
    print("="*70 + "\n")
    
    username = os.getenv("NRL_FANTASY_USERNAME")
    password = os.getenv("NRL_FANTASY_PASSWORD")
    
    if not username or not password:
        print("⚠️  Credentials not found!")
        return
    
    with get_db() as db:
        sync_service = TeamSyncService(db)
        client = None
        
        try:
            # Step 1: Sync user account
            print("Step 1: Syncing user account...")
            user, client = sync_service.sync_user_account(username, password)
            
            if not user or not client:
                print("✗ Failed to sync user account")
                return
            
            print(f"✓ User synced: ID={user.id}, Email={user.email}\n")
            
            # Step 2: Sync teams
            print("Step 2: Syncing fantasy teams...")
            teams = sync_service.sync_user_teams(user.id, client)
            
            if not teams:
                print("✗ No teams found")
                return
            
            print(f"✓ Found {len(teams)} team(s):")
            for team in teams:
                print(f"  - {team.team_name} (ID: {team.id})")
                print(f"    Round: {team.current_round}, Bank: ${team.bank_balance}k")
                print(f"    Trades: {team.trades_remaining}")
            print()
            
            # Step 3: Sync squads
            print("Step 3: Syncing team squads...")
            for team in teams:
                print(f"\nSyncing squad for: {team.team_name}")
                player_count = sync_service.sync_team_squad(team.id, client)
                print(f"✓ Synced {player_count} players")
            
            print("\n" + "="*70)
            print("Step-by-step sync complete!")
            print("="*70 + "\n")
        
        finally:
            # Clean up the authenticated client
            if client:
                try:
                    if hasattr(client, 'close'):
                        client.close()
                    elif hasattr(client, '__exit__'):
                        client.__exit__(None, None, None)
                except Exception as e:
                    print(f"Warning: Error closing client: {e}")


def example_query_synced_data():
    """
    Example: Query synced data from the database.
    
    This demonstrates how to access the synced team data.
    """
    print("\n" + "="*70)
    print(" "*20 + "Query Synced Team Data")
    print("="*70 + "\n")
    
    from nrl_fantasy.data.storage.models import User, UserFantasyTeam, UserFantasySquad, Player
    
    with get_db() as db:
        # Get all users
        users = db.query(User).all()
        print(f"Total users in database: {len(users)}\n")
        
        for user in users:
            print(f"User: {user.email}")
            print(f"  Display Name: {user.display_name or 'N/A'}")
            print(f"  Last Sync: {user.last_sync_at}")
            print(f"  Active: {user.is_active}")
            
            # Get teams for this user
            teams = db.query(UserFantasyTeam).filter(
                UserFantasyTeam.user_id == user.id,
                UserFantasyTeam.is_active == True
            ).all()
            
            print(f"  Teams: {len(teams)}")
            
            for team in teams:
                print(f"\n  Team: {team.team_name}")
                print(f"    Current Round: {team.current_round}")
                print(f"    Bank Balance: ${team.bank_balance}k")
                print(f"    Trades Remaining: {team.trades_remaining}")
                print(f"    Total Points: {team.total_points or 'N/A'}")
                
                # Get squad for this team
                squad = db.query(UserFantasySquad).join(Player).filter(
                    UserFantasySquad.team_id == team.id
                ).all()
                
                print(f"    Squad Size: {len(squad)} players")
                
                if squad:
                    # Show captain and vice-captain
                    captain = next((s for s in squad if s.is_captain), None)
                    vice_captain = next((s for s in squad if s.is_vice_captain), None)
                    
                    if captain:
                        print(f"    Captain: {captain.player.name}")
                    if vice_captain:
                        print(f"    Vice Captain: {vice_captain.player.name}")
                    
                    # Show bench players
                    bench = [s for s in squad if s.is_on_bench]
                    if bench:
                        print(f"    Bench: {len(bench)} players")
            
            print()
    
    print("="*70 + "\n")


def main():
    """Run example demonstrations."""
    print("\n" + "="*70)
    print(" "*15 + "NRL Fantasy Team Sync Service")
    print(" "*25 + "Examples")
    print("="*70)
    
    print("\nAvailable examples:")
    print("  1. Full Sync (recommended)")
    print("  2. Step-by-Step Sync")
    print("  3. Query Synced Data")
    print("  4. Run All Examples")
    
    try:
        choice = input("\nSelect example (1-4) [1]: ").strip() or "1"
        
        if choice == "1":
            example_full_sync()
        elif choice == "2":
            example_step_by_step_sync()
        elif choice == "3":
            example_query_synced_data()
        elif choice == "4":
            example_full_sync()
            print("\n" + "-"*70 + "\n")
            example_query_synced_data()
        else:
            print("Invalid choice. Running full sync...")
            example_full_sync()
    
    except (KeyboardInterrupt, EOFError):
        print("\n\nExiting...")
    
    print("\n" + "="*70)
    print("Examples complete!")
    print("\nNext steps:")
    print("  1. Set NRL_FANTASY_USERNAME and NRL_FANTASY_PASSWORD environment variables")
    print("  2. Complete endpoint discovery to enable real API data")
    print("  3. Integrate team sync into your application workflows")
    print("  4. Build UI features to display synced team data")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()

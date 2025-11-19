"""
Example usage of NRL Fantasy API Integration

This script demonstrates how to use the NRLFantasyClient and EndpointDiscovery tools.

Run this script to test the integration:
    python -m nrl_fantasy.integrations.example_usage
"""

import os
from nrl_fantasy.integrations import NRLFantasyClient, EndpointDiscovery


def test_client():
    """Test the NRL Fantasy API client."""
    print("\n" + "="*60)
    print("Testing NRL Fantasy API Client")
    print("="*60 + "\n")
    
    # Check if credentials are available
    username = os.getenv("NRL_FANTASY_USERNAME")
    password = os.getenv("NRL_FANTASY_PASSWORD")
    
    if not username or not password:
        print("⚠️  Credentials not found in environment variables")
        print("   Set NRL_FANTASY_USERNAME and NRL_FANTASY_PASSWORD to test authentication")
        print("   Continuing with unauthenticated tests...\n")
    
    # Initialize client using context manager
    with NRLFantasyClient() as client:
        print("✓ Client initialized successfully\n")
        
        # Test authentication if credentials are available
        if username and password:
            print("Attempting authentication...")
            if client.login():
                print("✓ Authentication successful!\n")
                
                # Test getting user teams
                print("Fetching user teams...")
                teams = client.get_user_teams()
                if teams:
                    print(f"✓ Retrieved {len(teams)} team(s)")
                    print(f"  First team preview: {list(teams[0].keys())[:5]}")
                else:
                    print("  No teams found or endpoint not available")
            else:
                print("✗ Authentication failed\n")
        
        # Test public endpoints (no auth required)
        print("\nTesting public endpoints...")
        
        # Get players
        print("\n1. Fetching players...")
        players = client.get_players()
        if players:
            print(f"✓ Retrieved {len(players)} players")
            if isinstance(players, list) and len(players) > 0:
                print(f"  Sample player: {list(players[0].keys())[:5]}")
        else:
            print("  ℹ  Players endpoint may require discovery")
        
        # Get teams
        print("\n2. Fetching NRL teams...")
        teams = client.get_teams()
        if teams:
            print(f"✓ Retrieved {len(teams)} teams")
            if isinstance(teams, list) and len(teams) > 0:
                print(f"  Sample team: {list(teams[0].keys())[:5]}")
        else:
            print("  ℹ  Teams endpoint may require discovery")
        
        # Get rounds
        print("\n3. Fetching rounds/fixtures...")
        rounds = client.get_rounds()
        if rounds:
            print(f"✓ Retrieved {len(rounds)} rounds")
        else:
            print("  ℹ  Rounds endpoint may require discovery")
    
    print("\n" + "="*60)
    print("Client test complete!")
    print("="*60 + "\n")


def test_discovery(quick_test: bool = True):
    """Test the endpoint discovery tool."""
    print("\n" + "="*60)
    print("Testing Endpoint Discovery Tool")
    print("="*60 + "\n")
    
    discovery = EndpointDiscovery(output_dir="test_discovery_results")
    
    if quick_test:
        print("Running quick test (5 endpoints)...\n")
        
        # Test just a few endpoints for demonstration
        test_endpoints = [
            "/api/players",
            "/api/teams",
            "/api/rounds",
            "/data/players.json",
            "/api/config",
        ]
        
        results = []
        for endpoint in test_endpoints:
            result = discovery.test_endpoint(endpoint)
            if result:
                results.append(result)
        
        print(f"\n✓ Quick test complete!")
        print(f"  Found {len(results)} working endpoints")
        
    else:
        print("Running full discovery (this may take a few minutes)...\n")
        summary = discovery.discover_all()
        
        print(f"\n✓ Full discovery complete!")
        print(f"  Working endpoints: {summary['total_discovered']}")
        print(f"  Results saved to: test_discovery_results/")
    
    # Generate and print report
    report = discovery.generate_report()
    print("\n" + report)


def main():
    """Run all example tests."""
    print("\n" + "="*70)
    print(" "*20 + "NRL Fantasy API Integration")
    print(" "*25 + "Example Usage")
    print("="*70)
    
    # Test the client
    test_client()
    
    # Ask user if they want to run discovery
    print("\n" + "="*70)
    print("Endpoint Discovery")
    print("="*70)
    print("\nWould you like to run endpoint discovery?")
    print("  1. Quick test (5 endpoints, ~10 seconds)")
    print("  2. Full discovery (all endpoints, ~2-3 minutes)")
    print("  3. Skip discovery")
    
    try:
        choice = input("\nEnter choice (1-3) [3]: ").strip() or "3"
        
        if choice == "1":
            test_discovery(quick_test=True)
        elif choice == "2":
            test_discovery(quick_test=False)
        else:
            print("\nSkipping endpoint discovery.")
    except (KeyboardInterrupt, EOFError):
        print("\n\nSkipping endpoint discovery.")
    
    print("\n" + "="*70)
    print("All tests complete!")
    print("\nNext steps:")
    print("  1. Set environment variables: NRL_FANTASY_USERNAME, NRL_FANTASY_PASSWORD")
    print("  2. Run full endpoint discovery to map the API")
    print("  3. Integrate discovered endpoints into your application")
    print("  4. Import user teams into your database")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()

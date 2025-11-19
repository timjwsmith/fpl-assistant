# NRL Fantasy API Integration - Usage Guide

This module provides a comprehensive client for interacting with the NRL Fantasy API and tools for discovering API endpoints.

## Setup

### 1. Install Dependencies

The module uses the `requests` library, which is already included in the project dependencies.

### 2. Configure Credentials

Set environment variables for authentication:

```bash
export NRL_FANTASY_USERNAME="your_username_or_email"
export NRL_FANTASY_PASSWORD="your_password"
```

**Important**: Never commit credentials to the repository. Always use environment variables.

## Using the NRL Fantasy Client

### Basic Usage

```python
from nrl_fantasy.integrations import NRLFantasyClient

# Initialize the client
client = NRLFantasyClient()

# Login (uses environment variables)
if client.login():
    print("Authentication successful!")
    
    # Get user's fantasy teams
    teams = client.get_user_teams()
    if teams:
        print(f"Found {len(teams)} team(s)")
    
    # Get all players
    players = client.get_players()
    if players:
        print(f"Retrieved {len(players)} players")
    
    # Get specific player stats
    player_stats = client.get_player_stats(player_id=12345)
    
    # Get league data
    league_data = client.get_league_data(league_id=67890)
    
    # Get NRL teams
    teams_data = client.get_teams()
    
    # Get rounds/fixtures
    rounds = client.get_rounds()

# Always close the session when done
client.close()
```

### Using Context Manager (Recommended)

```python
from nrl_fantasy.integrations import NRLFantasyClient

with NRLFantasyClient() as client:
    if client.login():
        teams = client.get_user_teams()
        players = client.get_players()
        # Session automatically closes when exiting the context
```

### Custom Rate Limiting

```python
# Set custom rate limit delay (default is 1.5 seconds)
client = NRLFantasyClient(rate_limit_delay=2.0)
```

### Manual Credentials

```python
# Override environment variables with manual credentials
client = NRLFantasyClient(
    username="my_username",
    password="my_password"
)
```

## Available Methods

### Authentication
- `login(username=None, password=None)` - Authenticate with NRL Fantasy

### Data Retrieval
- `get_user_teams()` - Get current user's fantasy team(s)
- `get_players(season=None, round_number=None)` - Get player data
- `get_player_stats(player_id, season=None)` - Get detailed player statistics
- `get_league_data(league_id)` - Get league information
- `get_teams(season=None)` - Get NRL team data
- `get_rounds(season=None)` - Get round/fixture data

## Using the Endpoint Discovery Tool

The endpoint discovery tool helps identify active NRL Fantasy API endpoints.

### Command Line Usage

```bash
# Run discovery from project root
python -m nrl_fantasy.integrations.endpoint_discovery
```

### Programmatic Usage

```python
from nrl_fantasy.integrations import EndpointDiscovery

# Initialize discovery tool
discovery = EndpointDiscovery(output_dir="my_results")

# Run comprehensive discovery
summary = discovery.discover_all()

# Generate human-readable report
report = discovery.generate_report()
print(report)

# Access discovered endpoints
print(f"Found {len(discovery.discovered_endpoints)} working endpoints")
for endpoint in discovery.discovered_endpoints:
    print(f"  - {endpoint}")
```

### Discovery Output

Results are saved to the specified output directory (default: `endpoint_discovery_results/`):

- `discovery_summary.json` - Complete summary with all findings
- `discovery_report.txt` - Human-readable report
- Individual JSON files for each discovered endpoint with sample data

### Targeted Discovery

```python
discovery = EndpointDiscovery()

# Discover only API endpoints
api_results = discovery.discover_api_endpoints()

# Discover only static data files
data_results = discovery.discover_data_files()

# Test a specific endpoint
result = discovery.test_endpoint("/api/players")
if result:
    print("Endpoint is active!")
```

## Security Best Practices

1. **Never commit credentials** - Always use environment variables
2. **Secure storage** - The client stores session tokens in memory only
3. **Password handling** - Passwords are never logged or printed
4. **Rate limiting** - Built-in delays prevent API abuse

## Error Handling

The client includes comprehensive error handling:

```python
client = NRLFantasyClient()

try:
    if not client.login():
        print("Authentication failed")
    else:
        players = client.get_players()
        if players is None:
            print("Failed to retrieve players")
        else:
            print(f"Success! Got {len(players)} players")
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
```

## Integration with Existing NRL Fantasy App

### Importing User Teams

```python
from nrl_fantasy.integrations import NRLFantasyClient
from nrl_fantasy.data.storage.database import Database

def import_user_team():
    """Import user's NRL Fantasy team into our database."""
    
    with NRLFantasyClient() as client:
        if not client.login():
            return False
        
        # Get user's teams
        teams = client.get_user_teams()
        if not teams:
            return False
        
        # Get current player data
        players = client.get_players()
        
        # Import into your database
        db = Database()
        for team in teams:
            db.import_fantasy_team(team, players)
        
        return True
```

## Logging

The module uses the project's centralized logging system. Logs include:

- Authentication attempts and results
- API request successes and failures
- Data retrieval operations
- Rate limiting activities

Logs are written to `logs/nrl_fantasy_YYYYMMDD.log`.

## Troubleshooting

### Authentication Issues

1. Verify credentials are correct
2. Check environment variables are set
3. Review logs for specific error messages

### No Data Returned

1. Check if authentication is required for the endpoint
2. Verify the API endpoint exists (use discovery tool)
3. Review rate limiting delays

### Discovery Finding No Endpoints

1. Check internet connection
2. Verify NRL Fantasy website is accessible
3. Check if API structure has changed

## Future Enhancements

Potential improvements for this module:

- OAuth authentication support (if available)
- Caching layer for frequently accessed data
- Webhook support for real-time updates
- Batch operations for efficiency
- Advanced filtering and querying options

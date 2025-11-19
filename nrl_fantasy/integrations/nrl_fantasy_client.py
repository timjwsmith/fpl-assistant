"""
NRL Fantasy API Client

A comprehensive client for interacting with NRL Fantasy API endpoints.
Handles authentication, session management, and data retrieval.

Usage Example:
    from nrl_fantasy.integrations import NRLFantasyClient
    
    client = NRLFantasyClient()
    
    # Login (credentials from environment variables)
    if client.login():
        # Get user's fantasy teams
        teams = client.get_user_teams()
        
        # Get player data
        players = client.get_players()
        
        # Get league data
        league_data = client.get_league_data(league_id=12345)
    
    client.close()
"""

import os
import time
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..utils.logger import setup_logger


class NRLFantasyClient:
    """
    Client for interacting with NRL Fantasy API.
    
    Features:
    - Session management with automatic retries
    - Authentication with username/password
    - Rate limiting to prevent API abuse
    - Comprehensive error handling
    - Secure credential management via environment variables
    """
    
    BASE_URL = "https://fantasy.nrl.com"
    API_BASE_URL = "https://fantasy.nrl.com/api"
    
    # Common user agent to mimic browser requests
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    
    # TODO: Discover actual authentication cookie names from NRL Fantasy site
    # These are placeholder names - update after endpoint discovery
    AUTH_COOKIE_NAMES = [
        'auth_token',
        'session_token', 
        'nrl_auth',
        'fantasy_session',
        'access_token',
        'user_token',
    ]
    
    def __init__(
        self, 
        username: Optional[str] = None, 
        password: Optional[str] = None,
        rate_limit_delay: float = 1.5
    ):
        """
        Initialize the NRL Fantasy API client.
        
        Args:
            username: NRL Fantasy username (defaults to NRL_FANTASY_USERNAME env var)
            password: NRL Fantasy password (defaults to NRL_FANTASY_PASSWORD env var)
            rate_limit_delay: Delay in seconds between requests (default: 1.5s)
        """
        self.logger = setup_logger(__name__, level="INFO")
        
        # Get credentials from environment if not provided
        self.username = username or os.getenv("NRL_FANTASY_USERNAME")
        self._password = password or os.getenv("NRL_FANTASY_PASSWORD")
        
        # Rate limiting
        self.rate_limit_delay = rate_limit_delay
        self.last_request_time = 0
        
        # Session setup
        self.session = self._create_session()
        self.authenticated = False
        self.user_id = None
        self.auth_token = None
        self.csrf_token = None
        
        self.logger.info("NRL Fantasy API client initialized")
    
    def _create_session(self) -> requests.Session:
        """
        Create a requests session with retry logic and proper headers.
        
        Returns:
            Configured requests.Session object
        """
        session = requests.Session()
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # Set default headers
        session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': self.BASE_URL,
        })
        
        return session
    
    def _rate_limit(self):
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last_request
            self.logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _is_authenticated(self) -> bool:
        """
        Check if the client is properly authenticated.
        
        This method validates authentication by checking for:
        1. An authentication token (JWT or bearer token)
        2. Specific authentication cookies (not just any session cookies)
        
        Returns:
            True if authenticated with valid credentials, False otherwise
        """
        # Check if we have an authentication token
        if self.auth_token:
            self.logger.debug("Authentication validated via auth_token")
            return True
        
        # TODO: After endpoint discovery, update AUTH_COOKIE_NAMES with actual cookie names
        # Check for specific authentication cookies (not just any cookies)
        if self.session.cookies:
            for cookie_name in self.AUTH_COOKIE_NAMES:
                if cookie_name in self.session.cookies:
                    self.logger.debug(f"Authentication validated via cookie: {cookie_name}")
                    return True
        
        self.logger.debug("No valid authentication credentials found")
        return False
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Make an HTTP request with rate limiting and error handling.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (relative to BASE_URL)
            **kwargs: Additional arguments to pass to requests
        
        Returns:
            JSON response as dictionary, or None if request failed
        """
        self._rate_limit()
        
        url = f"{self.BASE_URL}{endpoint}" if not endpoint.startswith('http') else endpoint
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            
            # Try to parse JSON response
            try:
                return response.json()
            except json.JSONDecodeError:
                self.logger.warning(f"Non-JSON response from {endpoint}")
                return {"text": response.text, "status_code": response.status_code}
                
        except requests.exceptions.HTTPError as e:
            self.logger.error(f"HTTP error for {endpoint}: {e}")
            if hasattr(e.response, 'text'):
                self.logger.debug(f"Response: {e.response.text[:200]}")
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed for {endpoint}: {e}")
        
        return None
    
    def login(self, username: Optional[str] = None, password: Optional[str] = None) -> bool:
        """
        Authenticate with NRL Fantasy.
        
        This method attempts to log in using multiple potential endpoints
        and authentication methods. It also handles CSRF token extraction if required.
        
        Args:
            username: Override username (optional)
            password: Override password (optional)
        
        Returns:
            True if authentication successful, False otherwise
        """
        if username:
            self.username = username
        if password:
            self._password = password
        
        if not self.username or not self._password:
            self.logger.error("Authentication failed: Username and password are required")
            return False
        
        self.logger.info(f"Attempting to authenticate user: {self.username}")
        
        # TODO: After endpoint discovery, check if CSRF token is needed
        # Try to get CSRF token from the homepage first
        self._extract_csrf_token()
        
        # Try various potential login endpoints
        login_endpoints = [
            "/api/auth/login",
            "/api/user/login",
            "/api/v1/auth/login",
            "/login",
        ]
        
        credentials = {
            "username": self.username,
            "password": self._password
        }
        
        # Also try email/password variant
        credentials_alt = {
            "email": self.username,
            "password": self._password
        }
        
        # Add CSRF token if we have one
        if self.csrf_token:
            credentials["csrf_token"] = self.csrf_token
            credentials_alt["csrf_token"] = self.csrf_token
        
        for endpoint in login_endpoints:
            self.logger.debug(f"Trying login endpoint: {endpoint}")
            
            # Try username/password
            response = self._make_request("POST", endpoint, json=credentials)
            
            if response:
                if self._process_login_response(response, endpoint):
                    return True
            
            # Try email/password variant
            response = self._make_request("POST", endpoint, json=credentials_alt)
            
            if response:
                if self._process_login_response(response, endpoint):
                    return True
        
        self.logger.error(
            "Authentication failed: Unable to authenticate with provided credentials. "
            "Please verify your username and password are correct."
        )
        return False
    
    def _extract_csrf_token(self):
        """
        Extract CSRF token from the NRL Fantasy homepage.
        
        TODO: After endpoint discovery, determine if CSRF tokens are required
        and update this method with the correct extraction logic.
        """
        try:
            self.logger.debug("Attempting to extract CSRF token")
            response = self.session.get(self.BASE_URL)
            
            # Look for CSRF token in cookies
            csrf_cookie_names = ['csrftoken', 'csrf_token', 'XSRF-TOKEN']
            for cookie_name in csrf_cookie_names:
                if cookie_name in self.session.cookies:
                    self.csrf_token = self.session.cookies[cookie_name]
                    self.logger.debug(f"CSRF token extracted from cookie: {cookie_name}")
                    return
            
            # TODO: Add HTML parsing logic if CSRF token is in meta tags or forms
            
        except Exception as e:
            self.logger.debug(f"Could not extract CSRF token: {e}")
            # Not critical - continue without CSRF token
    
    def _process_login_response(self, response: Dict[str, Any], endpoint: str = "") -> bool:
        """
        Process login response and extract authentication tokens.
        
        This method validates that authentication was successful by checking for:
        1. Explicit error responses indicating authentication failure
        2. Authentication tokens (JWT, bearer tokens, etc.)
        3. Specific authentication cookies (NOT just any session cookies)
        
        Args:
            response: API response dictionary
            endpoint: The endpoint that was called (for debugging)
        
        Returns:
            True if login successful and verified credentials found, False otherwise
        """
        # First, check for explicit error responses
        error_fields = ['error', 'errors', 'message', 'detail']
        for field in error_fields:
            if field in response:
                error_msg = response[field]
                # Check if this is actually an error (some APIs use 'message' for success too)
                if isinstance(error_msg, str):
                    error_lower = error_msg.lower()
                    if any(word in error_lower for word in ['invalid', 'incorrect', 'failed', 'unauthorized', 'denied']):
                        self.logger.error(f"Authentication failed at {endpoint}: {error_msg}")
                        return False
                elif isinstance(error_msg, (list, dict)):
                    self.logger.error(f"Authentication failed at {endpoint}: {error_msg}")
                    return False
        
        # Check for explicit success/failure indicators
        if 'success' in response and response['success'] is False:
            error_msg = response.get('message', 'Unknown authentication error')
            self.logger.error(f"Authentication failed at {endpoint}: {error_msg}")
            return False
        
        # Look for authentication tokens
        token_fields = ['token', 'access_token', 'auth_token', 'sessionToken', 'jwt', 'accessToken']
        token_found = False
        
        for field in token_fields:
            if field in response and response[field]:
                self.auth_token = response[field]
                self.session.headers.update({
                    'Authorization': f'Bearer {self.auth_token}'
                })
                token_found = True
                self.logger.info(f"Authentication successful via token: {field}")
                break
        
        # Extract user ID if available
        user_id_fields = ['user_id', 'userId', 'id', 'playerId', 'user', 'account_id']
        for field in user_id_fields:
            if field in response and response[field]:
                # Handle nested user objects
                if isinstance(response[field], dict):
                    self.user_id = response[field].get('id') or response[field].get('userId')
                else:
                    self.user_id = response[field]
                if self.user_id:
                    self.logger.debug(f"User ID extracted: {self.user_id}")
                    break
        
        # TODO: After endpoint discovery, update AUTH_COOKIE_NAMES with actual cookie names
        # Check for SPECIFIC authentication cookies (not just any cookies)
        # Anonymous sessions also have cookies, so we need to check for auth-specific ones
        auth_cookie_found = False
        if self.session.cookies:
            for cookie_name in self.AUTH_COOKIE_NAMES:
                if cookie_name in self.session.cookies:
                    cookie_value = self.session.cookies[cookie_name]
                    # Make sure cookie has a value (not empty)
                    if cookie_value:
                        auth_cookie_found = True
                        self.logger.info(f"Authentication successful via cookie: {cookie_name}")
                        break
        
        # Only mark as authenticated if we have a token OR a specific auth cookie
        if token_found or auth_cookie_found:
            self.authenticated = True
            return True
        
        # If we got here and have a 'success': true response but no tokens,
        # it might still be valid but we can't verify it
        if response.get('success') is True:
            self.logger.warning(
                f"Login response from {endpoint} indicates success but no authentication "
                "tokens or recognized auth cookies found. Authentication state uncertain."
            )
        
        self.logger.debug(
            f"No valid authentication credentials found in response from {endpoint}. "
            "Response did not contain recognized auth tokens or cookies."
        )
        return False
    
    def get_user_teams(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get the current user's fantasy team(s).
        
        Requires authentication.
        
        Returns:
            List of team dictionaries, or None if request failed
        """
        if not self._is_authenticated():
            self.logger.error(
                "Authentication required: Please call login() with valid credentials "
                "before attempting to retrieve user teams."
            )
            return None
        
        endpoints_to_try = [
            "/api/user/teams",
            "/api/teams",
            "/api/my/teams",
            f"/api/users/{self.user_id}/teams" if self.user_id else None,
        ]
        
        for endpoint in endpoints_to_try:
            if endpoint is None:
                continue
            
            self.logger.debug(f"Trying to get teams from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                # Response might be a list or a dict with teams key
                if isinstance(response, list):
                    self.logger.info(f"Retrieved {len(response)} team(s)")
                    return response
                elif isinstance(response, dict) and 'teams' in response:
                    teams = response['teams']
                    self.logger.info(f"Retrieved {len(teams)} team(s)")
                    return teams
        
        self.logger.warning("Could not retrieve user teams")
        return None
    
    def get_players(
        self, 
        season: Optional[int] = None,
        round_number: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get player data from NRL Fantasy.
        
        Args:
            season: Specific season year (optional)
            round_number: Specific round number (optional)
        
        Returns:
            List of player dictionaries, or None if request failed
        """
        current_year = datetime.now().year
        season = season or current_year
        
        endpoints_to_try = [
            "/api/players",
            f"/api/players/{season}",
            f"/api/season/{season}/players",
            "/api/data/players",
            "/api/v1/players",
        ]
        
        if round_number:
            endpoints_to_try.extend([
                f"/api/players/{season}/round/{round_number}",
                f"/api/season/{season}/round/{round_number}/players",
            ])
        
        for endpoint in endpoints_to_try:
            self.logger.debug(f"Trying to get players from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                # Response might be a list or a dict with players key
                if isinstance(response, list):
                    self.logger.info(f"Retrieved {len(response)} player(s)")
                    return response
                elif isinstance(response, dict) and 'players' in response:
                    players = response['players']
                    self.logger.info(f"Retrieved {len(players)} player(s)")
                    return players
        
        self.logger.warning("Could not retrieve player data")
        return None
    
    def get_league_data(self, league_id: int) -> Optional[Dict[str, Any]]:
        """
        Get data for a specific league.
        
        May require authentication for private leagues.
        
        Args:
            league_id: The ID of the league
        
        Returns:
            League data dictionary, or None if request failed
        """
        if not self._is_authenticated():
            self.logger.warning(
                "Not authenticated. Private league data may not be accessible. "
                "Call login() first if you encounter issues."
            )
        
        endpoints_to_try = [
            f"/api/leagues/{league_id}",
            f"/api/league/{league_id}",
            f"/api/v1/leagues/{league_id}",
        ]
        
        for endpoint in endpoints_to_try:
            self.logger.debug(f"Trying to get league data from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                self.logger.info(f"Retrieved league data for league {league_id}")
                return response
        
        self.logger.warning(f"Could not retrieve league data for league {league_id}")
        return None
    
    def get_rounds(self, season: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Get round/fixture data.
        
        Args:
            season: Specific season year (optional, defaults to current year)
        
        Returns:
            List of round dictionaries, or None if request failed
        """
        current_year = datetime.now().year
        season = season or current_year
        
        endpoints_to_try = [
            f"/api/season/{season}/rounds",
            f"/api/rounds/{season}",
            "/api/rounds",
            f"/api/fixtures/{season}",
            "/api/fixtures",
        ]
        
        for endpoint in endpoints_to_try:
            self.logger.debug(f"Trying to get rounds from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                if isinstance(response, list):
                    self.logger.info(f"Retrieved {len(response)} round(s)")
                    return response
                elif isinstance(response, dict) and 'rounds' in response:
                    rounds = response['rounds']
                    self.logger.info(f"Retrieved {len(rounds)} round(s)")
                    return rounds
        
        self.logger.warning("Could not retrieve round data")
        return None
    
    def get_teams(self, season: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Get NRL team data.
        
        Args:
            season: Specific season year (optional)
        
        Returns:
            List of team dictionaries, or None if request failed
        """
        current_year = datetime.now().year
        season = season or current_year
        
        endpoints_to_try = [
            "/api/teams",
            f"/api/teams/{season}",
            f"/api/season/{season}/teams",
            "/api/clubs",
        ]
        
        for endpoint in endpoints_to_try:
            self.logger.debug(f"Trying to get teams from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                if isinstance(response, list):
                    self.logger.info(f"Retrieved {len(response)} team(s)")
                    return response
                elif isinstance(response, dict) and 'teams' in response:
                    teams = response['teams']
                    self.logger.info(f"Retrieved {len(teams)} team(s)")
                    return teams
        
        self.logger.warning("Could not retrieve team data")
        return None
    
    def get_player_stats(
        self, 
        player_id: int,
        season: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed statistics for a specific player.
        
        Args:
            player_id: The ID of the player
            season: Specific season year (optional)
        
        Returns:
            Player statistics dictionary, or None if request failed
        """
        current_year = datetime.now().year
        season = season or current_year
        
        endpoints_to_try = [
            f"/api/players/{player_id}",
            f"/api/players/{player_id}/stats",
            f"/api/players/{player_id}/{season}",
            f"/api/player/{player_id}",
        ]
        
        for endpoint in endpoints_to_try:
            self.logger.debug(f"Trying to get player stats from: {endpoint}")
            response = self._make_request("GET", endpoint)
            
            if response:
                self.logger.info(f"Retrieved stats for player {player_id}")
                return response
        
        self.logger.warning(f"Could not retrieve stats for player {player_id}")
        return None
    
    def close(self):
        """Close the session and cleanup resources."""
        if self.session:
            self.session.close()
            self.logger.info("Session closed")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

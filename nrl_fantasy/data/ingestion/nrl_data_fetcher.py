"""Fetch NRL match data from GitHub repositories"""
import requests
import json
from typing import Dict, List
from datetime import datetime


class NRLDataFetcher:
    """Fetch match and player statistics from NRL-Data GitHub repository"""
    
    def __init__(self):
        self.base_url = "https://raw.githubusercontent.com/beauhobba/NRL-Data/main/data"
        
    def fetch_player_stats(self, year: int) -> List[Dict]:
        """
        Fetch player statistics for a given year from NRL-Data repository
        
        Args:
            year: Season year (e.g., 2024)
            
        Returns:
            List of player statistics dictionaries
        """
        url = f"{self.base_url}/{year}/player_stats.json"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            return self._parse_player_stats(data)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching player stats for {year}: {e}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON for {year}: {e}")
            return []
    
    def _parse_player_stats(self, data: Dict) -> List[Dict]:
        """Parse the NRL-Data JSON structure into flat player stat records"""
        parsed_stats = []
        
        # NRL-Data structure varies, implement flexible parsing
        if isinstance(data, dict):
            for round_key, round_data in data.items():
                if isinstance(round_data, list):
                    for match in round_data:
                        parsed_stats.extend(self._extract_match_stats(match, round_key))
                elif isinstance(round_data, dict):
                    for match_key, match_data in round_data.items():
                        parsed_stats.extend(self._extract_match_stats(match_data, round_key))
        
        return parsed_stats
    
    def _extract_match_stats(self, match_data: Dict, round_num: str) -> List[Dict]:
        """Extract player stats from a single match"""
        stats = []
        
        if not isinstance(match_data, dict):
            return stats
        
        # Look for player stats in various possible keys
        for key in ['home_players', 'away_players', 'players', 'player_stats']:
            if key in match_data and isinstance(match_data[key], list):
                for player_stat in match_data[key]:
                    if isinstance(player_stat, dict):
                        player_stat['round'] = round_num
                        stats.append(player_stat)
        
        return stats
    
    def fetch_match_results(self, year: int) -> List[Dict]:
        """
        Fetch match results for a given year
        
        Args:
            year: Season year
            
        Returns:
            List of match result dictionaries
        """
        url = f"{self.base_url}/{year}/matches.json"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            return self._parse_match_results(data)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching matches for {year}: {e}")
            return []
        except json.JSONDecodeError:
            return []
    
    def _parse_match_results(self, data: Dict) -> List[Dict]:
        """Parse match results from JSON"""
        matches = []
        
        if isinstance(data, list):
            matches = data
        elif isinstance(data, dict):
            for round_key, round_matches in data.items():
                if isinstance(round_matches, list):
                    for match in round_matches:
                        if isinstance(match, dict):
                            match['round'] = round_key
                            matches.append(match)
        
        return matches


class FootyStatisticsScraper:
    """Scrape fantasy price data from FootyStatistics.com"""
    
    def __init__(self):
        self.base_url = "https://footystatistics.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def fetch_price_data(self, round_num: int = None) -> List[Dict]:
        """
        Fetch fantasy price data for current or specific round
        
        Note: This is a placeholder implementation. Real implementation would need:
        1. HTML parsing with BeautifulSoup
        2. Proper rate limiting
        3. Respect for robots.txt
        4. Error handling for anti-scraping measures
        
        Args:
            round_num: Round number (None for current)
            
        Returns:
            List of player price dictionaries
        """
        # For MVP, return empty list
        # Real implementation would scrape the breakevens page
        print("Note: FootyStatistics scraping requires BeautifulSoup and careful rate limiting")
        print("Consider using their API if available or manual CSV export for MVP")
        return []
    
    def parse_breakevens_page(self, html: str) -> List[Dict]:
        """
        Parse the breakevens page HTML
        
        Would extract:
        - Player names
        - Current prices
        - Price changes
        - Breakeven scores
        - Ownership percentages
        """
        # Placeholder for real HTML parsing
        return []


def download_historical_data(start_year: int = 2022, end_year: int = 2024):
    """
    Download historical NRL data for multiple seasons
    
    Args:
        start_year: First season to download
        end_year: Last season to download
    """
    fetcher = NRLDataFetcher()
    
    all_data = {
        'player_stats': [],
        'matches': []
    }
    
    for year in range(start_year, end_year + 1):
        print(f"Fetching data for {year}...")
        
        player_stats = fetcher.fetch_player_stats(year)
        matches = fetcher.fetch_match_results(year)
        
        all_data['player_stats'].extend(player_stats)
        all_data['matches'].extend(matches)
        
        print(f"  - Fetched {len(player_stats)} player stats")
        print(f"  - Fetched {len(matches)} matches")
    
    return all_data


if __name__ == "__main__":
    # Test fetcher
    data = download_historical_data(2023, 2024)
    print(f"\nTotal player stats: {len(data['player_stats'])}")
    print(f"Total matches: {len(data['matches'])}")

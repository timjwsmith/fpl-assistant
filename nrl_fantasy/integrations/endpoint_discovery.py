"""
NRL Fantasy API Endpoint Discovery Tool

This tool helps discover and test NRL Fantasy API endpoints by probing
common patterns and logging successful responses.

Usage:
    from nrl_fantasy.integrations import EndpointDiscovery
    
    discovery = EndpointDiscovery()
    discovery.discover_all()
    
    # Or run from command line:
    python -m nrl_fantasy.integrations.endpoint_discovery
"""

import os
import json
import time
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from pathlib import Path
import requests

from ..utils.logger import setup_logger


class EndpointDiscovery:
    """
    Tool for discovering and testing NRL Fantasy API endpoints.
    
    Based on research findings, this tool tests common endpoint patterns
    to identify active API endpoints and save sample responses.
    """
    
    BASE_URL = "https://fantasy.nrl.com"
    
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    
    def __init__(self, output_dir: str = "endpoint_discovery_results"):
        """
        Initialize the endpoint discovery tool.
        
        Args:
            output_dir: Directory to save discovery results
        """
        self.logger = setup_logger(__name__, level="INFO")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
        self.discovered_endpoints: Set[str] = set()
        self.failed_endpoints: Set[str] = set()
        
        self.logger.info(f"Endpoint discovery initialized. Results will be saved to: {self.output_dir}")
    
    def test_endpoint(self, endpoint: str, method: str = "GET") -> Optional[Dict[str, Any]]:
        """
        Test a single endpoint and return the response if successful.
        
        Args:
            endpoint: The endpoint to test (relative to BASE_URL)
            method: HTTP method to use (default: GET)
        
        Returns:
            Response data if successful, None otherwise
        """
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            self.logger.debug(f"Testing: {method} {url}")
            response = self.session.request(method, url, timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.logger.info(f"✓ SUCCESS: {endpoint} (status: {response.status_code})")
                    self.discovered_endpoints.add(endpoint)
                    return {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status_code,
                        "data": data,
                        "headers": dict(response.headers),
                        "discovered_at": datetime.now().isoformat()
                    }
                except json.JSONDecodeError:
                    self.logger.debug(f"✓ Non-JSON response from {endpoint}")
                    self.discovered_endpoints.add(endpoint)
                    return {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status_code,
                        "content_type": response.headers.get('Content-Type'),
                        "text_preview": response.text[:500],
                        "discovered_at": datetime.now().isoformat()
                    }
            else:
                self.logger.debug(f"✗ {endpoint} returned status {response.status_code}")
                self.failed_endpoints.add(endpoint)
                
        except requests.exceptions.RequestException as e:
            self.logger.debug(f"✗ {endpoint} failed: {e}")
            self.failed_endpoints.add(endpoint)
        
        # Rate limiting
        time.sleep(1)
        return None
    
    def discover_api_endpoints(self) -> List[Dict[str, Any]]:
        """
        Discover common API endpoints based on research patterns.
        
        Returns:
            List of successful endpoint responses
        """
        self.logger.info("Starting API endpoint discovery...")
        
        current_year = datetime.now().year
        results = []
        
        # Common endpoint patterns based on research
        endpoints_to_test = [
            # Player endpoints
            "/api/players",
            f"/api/players/{current_year}",
            "/api/data/players",
            "/api/v1/players",
            
            # Team endpoints
            "/api/teams",
            f"/api/teams/{current_year}",
            "/api/clubs",
            "/api/data/teams",
            
            # Round/Fixture endpoints
            "/api/rounds",
            f"/api/rounds/{current_year}",
            "/api/fixtures",
            f"/api/fixtures/{current_year}",
            f"/api/season/{current_year}/rounds",
            
            # Stadium/Venue endpoints
            "/api/stadiums",
            "/api/venues",
            "/api/data/stadiums",
            
            # Stats endpoints
            "/api/stats",
            "/api/statistics",
            f"/api/stats/{current_year}",
            
            # User/Auth endpoints (may require authentication)
            "/api/user",
            "/api/user/teams",
            "/api/my/teams",
            "/api/auth/user",
            
            # League endpoints
            "/api/leagues",
            "/api/competitions",
            
            # Game/Match data
            "/api/games",
            "/api/matches",
            f"/api/matches/{current_year}",
            
            # Configuration/Settings
            "/api/config",
            "/api/settings",
            "/api/bootstrap",
            "/api/bootstrap-static",
            
            # Specific versioned endpoints
            "/api/v1/bootstrap",
            "/api/v1/config",
            "/api/v2/players",
        ]
        
        for endpoint in endpoints_to_test:
            result = self.test_endpoint(endpoint)
            if result:
                results.append(result)
                self._save_endpoint_result(result)
        
        self.logger.info(f"Discovery complete. Found {len(results)} working endpoints.")
        return results
    
    def discover_data_files(self) -> List[Dict[str, Any]]:
        """
        Discover JSON data files that may be served statically.
        
        Based on Morgan Potter's research finding 5-6 JSON files.
        
        Returns:
            List of successful file discoveries
        """
        self.logger.info("Searching for static JSON data files...")
        
        results = []
        current_year = datetime.now().year
        
        # Common static file patterns
        data_files_to_test = [
            # Root level data files
            "/data/players.json",
            "/data/teams.json",
            "/data/fixtures.json",
            "/data/rounds.json",
            "/data/stadiums.json",
            "/data/stats.json",
            
            # Year-specific files
            f"/data/{current_year}/players.json",
            f"/data/{current_year}/teams.json",
            f"/data/{current_year}/fixtures.json",
            
            # Alternative paths
            "/static/data/players.json",
            "/static/data/teams.json",
            "/assets/data/players.json",
            
            # Fantasy Coach specific (premium data)
            "/data/fantasy-coach/players.json",
            "/data/fantasy-coach/predictions.json",
            "/fantasy-coach/data/players.json",
        ]
        
        for file_path in data_files_to_test:
            result = self.test_endpoint(file_path)
            if result:
                results.append(result)
                self._save_endpoint_result(result)
        
        self.logger.info(f"Data file search complete. Found {len(results)} files.")
        return results
    
    def discover_all(self) -> Dict[str, Any]:
        """
        Run all discovery methods and generate a comprehensive report.
        
        Returns:
            Summary of all discoveries
        """
        self.logger.info("=" * 60)
        self.logger.info("Starting comprehensive NRL Fantasy API discovery")
        self.logger.info("=" * 60)
        
        api_results = self.discover_api_endpoints()
        data_file_results = self.discover_data_files()
        
        summary = {
            "discovery_date": datetime.now().isoformat(),
            "base_url": self.BASE_URL,
            "total_discovered": len(self.discovered_endpoints),
            "total_failed": len(self.failed_endpoints),
            "api_endpoints": api_results,
            "data_files": data_file_results,
            "discovered_endpoints_list": sorted(list(self.discovered_endpoints)),
        }
        
        # Save summary report
        summary_file = self.output_dir / "discovery_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info("=" * 60)
        self.logger.info(f"Discovery complete!")
        self.logger.info(f"  Working endpoints: {len(self.discovered_endpoints)}")
        self.logger.info(f"  Failed attempts: {len(self.failed_endpoints)}")
        self.logger.info(f"  Results saved to: {self.output_dir}")
        self.logger.info("=" * 60)
        
        return summary
    
    def _save_endpoint_result(self, result: Dict[str, Any]):
        """
        Save individual endpoint result to a file.
        
        Args:
            result: The endpoint result dictionary
        """
        # Create safe filename from endpoint
        endpoint = result['endpoint']
        safe_name = endpoint.replace('/', '_').replace('.', '_').strip('_')
        filename = f"{safe_name}_{int(time.time())}.json"
        
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)
        
        self.logger.debug(f"Saved result to: {filepath}")
    
    def generate_report(self) -> str:
        """
        Generate a human-readable report of discoveries.
        
        Returns:
            Formatted report string
        """
        report_lines = [
            "=" * 60,
            "NRL Fantasy API Endpoint Discovery Report",
            "=" * 60,
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Base URL: {self.BASE_URL}",
            "",
            f"Successfully Discovered: {len(self.discovered_endpoints)} endpoints",
            ""
        ]
        
        if self.discovered_endpoints:
            report_lines.append("Working Endpoints:")
            report_lines.append("-" * 60)
            for endpoint in sorted(self.discovered_endpoints):
                report_lines.append(f"  ✓ {endpoint}")
            report_lines.append("")
        
        report_lines.extend([
            f"Failed Attempts: {len(self.failed_endpoints)}",
            "",
            f"Detailed results saved to: {self.output_dir}",
            "=" * 60,
        ])
        
        report = "\n".join(report_lines)
        
        # Save report to file
        report_file = self.output_dir / "discovery_report.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        return report


def main():
    """Command-line interface for endpoint discovery."""
    print("\n🔍 NRL Fantasy API Endpoint Discovery Tool\n")
    
    discovery = EndpointDiscovery()
    summary = discovery.discover_all()
    
    # Print report
    print("\n" + discovery.generate_report())
    
    # Print some sample data if available
    if summary['api_endpoints']:
        print("\n📊 Sample Data from First Discovered Endpoint:")
        print("-" * 60)
        first_result = summary['api_endpoints'][0]
        print(f"Endpoint: {first_result['endpoint']}")
        if 'data' in first_result:
            print(json.dumps(first_result['data'], indent=2)[:500] + "...")


if __name__ == "__main__":
    main()

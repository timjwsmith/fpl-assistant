"""Tests for NRL Fantasy scoring engine"""
import pytest
from unittest.mock import Mock
from nrl_fantasy.scoring.engine import ScoringEngine
from nrl_fantasy.data.storage.models import PlayerMatchStats, FantasyScoringRule


class TestScoringEngine:
    """Test cases for scoring engine accuracy"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.mock_db = Mock()
        
        # Mock scoring rules (2024 season)
        self.mock_rules = [
            Mock(stat_key='tries', points=4.0, formula_type='flat'),
            Mock(stat_key='try_assists', points=4.0, formula_type='flat'),
            Mock(stat_key='line_breaks', points=4.0, formula_type='flat'),
            Mock(stat_key='linebreak_assists', points=2.0, formula_type='flat'),
            Mock(stat_key='run_metres', points=0.1, formula_type='per_1'),
            Mock(stat_key='tackle_breaks', points=1.0, formula_type='flat'),
            Mock(stat_key='tackles', points=1.0, formula_type='flat'),
            Mock(stat_key='offloads', points=1.0, formula_type='flat'),
            Mock(stat_key='missed_tackles', points=-1.0, formula_type='flat'),
            Mock(stat_key='errors', points=-3.0, formula_type='flat'),
            Mock(stat_key='penalties_conceded', points=-3.0, formula_type='flat'),
        ]
        
        self.mock_db.query().filter().all.return_value = self.mock_rules
        
        self.engine = ScoringEngine(self.mock_db, season=2024)
    
    def test_basic_scoring(self):
        """Test basic fantasy scoring calculation"""
        stats = Mock(spec=PlayerMatchStats)
        stats.tries = 1
        stats.try_assists = 0
        stats.linebreak_assists = 0
        stats.line_breaks = 0
        stats.run_metres = 100
        stats.tackle_breaks = 3
        stats.tackles = 30
        stats.offloads = 2
        stats.kick_metres = 0
        stats.forced_dropouts = 0
        stats.intercepts = 0
        stats.missed_tackles = 2
        stats.errors = 1
        stats.penalties_conceded = 0
        stats.sin_bins = 0
        stats.send_offs = 0
        
        # Expected: 1×4 (try) + 100×0.1 (metres) + 3×1 (breaks) + 30×1 (tackles) + 2×1 (offloads) - 2×1 (missed) - 1×3 (error)
        # = 4 + 10 + 3 + 30 + 2 - 2 - 3 = 44
        
        points = self.engine.calculate_points(stats)
        assert points == 44.0
    
    def test_premium_scorer(self):
        """Test high scoring player calculation"""
        stats = Mock(spec=PlayerMatchStats)
        stats.tries = 2
        stats.try_assists = 2
        stats.linebreak_assists = 1
        stats.line_breaks = 2
        stats.run_metres = 200
        stats.tackle_breaks = 6
        stats.tackles = 25
        stats.offloads = 3
        stats.kick_metres = 0
        stats.forced_dropouts = 0
        stats.intercepts = 0
        stats.missed_tackles = 0
        stats.errors = 0
        stats.penalties_conceded = 0
        stats.sin_bins = 0
        stats.send_offs = 0
        
        # Expected: 2×4 + 2×4 + 1×2 + 2×4 + 200×0.1 + 6×1 + 25×1 + 3×1
        # = 8 + 8 + 2 + 8 + 20 + 6 + 25 + 3 = 80
        
        points = self.engine.calculate_points(stats)
        assert points == 80.0
    
    def test_forward_scorer(self):
        """Test typical forward scoring"""
        stats = Mock(spec=PlayerMatchStats)
        stats.tries = 0
        stats.try_assists = 0
        stats.linebreak_assists = 0
        stats.line_breaks = 0
        stats.run_metres = 150
        stats.tackle_breaks = 4
        stats.tackles = 40
        stats.offloads = 2
        stats.kick_metres = 0
        stats.forced_dropouts = 0
        stats.intercepts = 0
        stats.missed_tackles = 3
        stats.errors = 1
        stats.penalties_conceded = 1
        stats.sin_bins = 0
        stats.send_offs = 0
        
        # Expected: 150×0.1 + 4×1 + 40×1 + 2×1 - 3×1 - 1×3 - 1×3
        # = 15 + 4 + 40 + 2 - 3 - 3 - 3 = 52
        
        points = self.engine.calculate_points(stats)
        assert points == 52.0
    
    def test_negative_scoring(self):
        """Test player with many errors"""
        stats = Mock(spec=PlayerMatchStats)
        stats.tries = 0
        stats.try_assists = 0
        stats.linebreak_assists = 0
        stats.line_breaks = 0
        stats.run_metres = 50
        stats.tackle_breaks = 0
        stats.tackles = 10
        stats.offloads = 0
        stats.kick_metres = 0
        stats.forced_dropouts = 0
        stats.intercepts = 0
        stats.missed_tackles = 5
        stats.errors = 3
        stats.penalties_conceded = 2
        stats.sin_bins = 0
        stats.send_offs = 0
        
        # Expected: 50×0.1 + 10×1 - 5×1 - 3×3 - 2×3
        # = 5 + 10 - 5 - 9 - 6 = -5
        
        points = self.engine.calculate_points(stats)
        assert points == -5.0
    
    def test_validation_against_known_score(self):
        """Test validation method"""
        stats = Mock(spec=PlayerMatchStats)
        stats.tries = 1
        stats.try_assists = 0
        stats.linebreak_assists = 0
        stats.line_breaks = 1
        stats.run_metres = 120
        stats.tackle_breaks = 3
        stats.tackles = 25
        stats.offloads = 1
        stats.kick_metres = 0
        stats.forced_dropouts = 0
        stats.intercepts = 0
        stats.missed_tackles = 1
        stats.errors = 0
        stats.penalties_conceded = 0
        stats.sin_bins = 0
        stats.send_offs = 0
        
        # Calculated: 4 + 4 + 12 + 3 + 25 + 1 - 1 = 48
        known_points = 48.0
        
        error = self.engine.validate_calculation(stats, known_points)
        assert error == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

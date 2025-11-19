"""Tests for prediction engine"""
import pytest
from unittest.mock import Mock, MagicMock
from nrl_fantasy.models.predictor import PlayerPredictor


class TestPlayerPredictor:
    """Test cases for player prediction logic"""
    
    def test_no_history_fallback(self):
        """Test prediction for player with no history"""
        mock_db = Mock()
        mock_db.query().filter().order_by().limit().all.return_value = []
        
        predictor = PlayerPredictor(mock_db)
        
        result = predictor.predict_next_round(1, 2024, 6)
        
        assert result['predicted_points'] == 35.0
        assert result['confidence'] == 0.3
        assert result['method'] == 'no_history'
    
    def test_weighted_average_prediction(self):
        """Test weighted average prediction method"""
        mock_db = Mock()
        
        # Mock recent scores
        mock_scores = [
            Mock(fantasy_points=50.0),  # Most recent
            Mock(fantasy_points=48.0),
            Mock(fantasy_points=52.0),
            Mock(fantasy_points=45.0),
            Mock(fantasy_points=47.0),
        ]
        
        # Mock stats for minutes
        mock_stats = [
            Mock(minutes=70),
            Mock(minutes=68),
            Mock(minutes=72),
            Mock(minutes=65),
            Mock(minutes=70),
        ]
        
        # Create query mock that returns different results for different queries
        query_mock = MagicMock()
        
        # First query returns fantasy scores
        scores_query = Mock()
        scores_query.order_by().limit().all.return_value = mock_scores
        
        # Second query returns match stats  
        stats_query = Mock()
        stats_query.order_by().limit().all.return_value = mock_stats
        
        # Set up the mock to return different queries
        mock_db.query.side_effect = [scores_query, stats_query]
        
        predictor = PlayerPredictor(mock_db)
        
        result = predictor.predict_next_round(1, 2024, 6)
        
        # Should use weighted average
        assert result['method'] == 'weighted_average'
        assert result['predicted_points'] > 40
        assert result['predicted_points'] < 55
        assert result['confidence'] > 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

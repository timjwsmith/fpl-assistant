"""Configuration settings for NRL Fantasy Edge"""
from pydantic_settings import BaseSettings
from pathlib import Path
import os


class DatabaseConfig:
    """Database configuration with environment-based selection"""
    
    @staticmethod
    def get_database_url() -> str:
        """
        Get database URL based on environment
        
        Priority:
        1. NRL_DATABASE_URL environment variable
        2. DATABASE_URL (for PostgreSQL/Neon)
        3. Default to SQLite
        """
        # Check for NRL-specific database URL
        nrl_db_url = os.getenv('NRL_DATABASE_URL')
        if nrl_db_url:
            return nrl_db_url
        
        # Check for general DATABASE_URL (PostgreSQL)
        db_url = os.getenv('DATABASE_URL')
        if db_url and 'postgresql' in db_url:
            # Use PostgreSQL for production
            return db_url
        
        # Default to SQLite for development
        return "sqlite:///nrl_fantasy.db"
    
    @staticmethod
    def is_postgresql() -> bool:
        """Check if using PostgreSQL"""
        return 'postgresql' in DatabaseConfig.get_database_url()
    
    @staticmethod
    def get_connection_args() -> dict:
        """Get database-specific connection arguments"""
        if DatabaseConfig.is_postgresql():
            return {
                "pool_size": 10,
                "max_overflow": 20,
                "pool_pre_ping": True,
                "pool_recycle": 3600
            }
        else:
            return {
                "check_same_thread": False
            }


class Settings(BaseSettings):
    """Application settings"""
    
    # Database - use NRL_DATABASE_URL to avoid conflicts with existing FPL app
    nrl_database_url: str = DatabaseConfig.get_database_url()
    
    # API
    api_title: str = "NRL Fantasy Edge API"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 5000
    
    # Data sources
    nrl_data_repo_url: str = "https://github.com/nrl-data/nrl-data"
    
    # Scoring
    current_season: int = 2024
    
    # Model
    model_lookback_games: int = 5
    prediction_confidence_threshold: float = 0.7
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

"""Configuration settings for NRL Fantasy Edge"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    # Database - use NRL_DATABASE_URL to avoid conflicts with existing FPL app
    nrl_database_url: str = "sqlite:///nrl_fantasy.db"
    
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

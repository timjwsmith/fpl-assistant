"""Centralized logging configuration"""
import logging
import sys
from pathlib import Path
from datetime import datetime


def setup_logger(name: str, level: str = "INFO", log_file: bool = True) -> logging.Logger:
    """
    Set up a logger with console and optional file output
    
    Args:
        name: Logger name (usually __name__)
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_file: Whether to write to log file
        
    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        log_filename = log_dir / f"nrl_fantasy_{datetime.now().strftime('%Y%m%d')}.log"
        
        file_handler = logging.FileHandler(log_filename)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# Create default logger
default_logger = setup_logger('nrl_fantasy')


def log_prediction(player_id: int, predicted_points: float, confidence: float):
    """Log a prediction for monitoring"""
    default_logger.info(
        f"Prediction - Player {player_id}: {predicted_points} pts (confidence: {confidence:.0%})"
    )


def log_error(operation: str, error: Exception):
    """Log an error with context"""
    default_logger.error(f"Error in {operation}: {str(error)}", exc_info=True)


def log_data_import(source: str, records: int):
    """Log data import completion"""
    default_logger.info(f"Imported {records} records from {source}")

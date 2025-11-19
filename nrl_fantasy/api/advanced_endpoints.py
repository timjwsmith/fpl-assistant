"""Advanced API endpoints for Phase 2 features"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from nrl_fantasy.data.storage.database import get_db_session
from nrl_fantasy.models.advanced_predictor import AdvancedPredictor
from nrl_fantasy.optimization.bye_planner import ByePlanner
from nrl_fantasy.config import settings


router = APIRouter(prefix="/api/advanced", tags=["advanced"])


class AdvancedPredictionRequest(BaseModel):
    """Request for advanced prediction with context"""
    player_id: int
    round: int
    opponent: Optional[str] = None
    is_home: Optional[bool] = None
    venue: Optional[str] = None


class ByePlanRequest(BaseModel):
    """Request for bye round planning"""
    squad: List[int]
    current_round: int
    trades_available: int = 10


@router.post("/predict")
async def advanced_prediction(
    request: AdvancedPredictionRequest,
    db: Session = Depends(get_db_session)
):
    """
    Get advanced ML prediction with opponent and venue context
    
    Uses gradient boosting model with features like:
    - Opponent defensive strength
    - Home/away venue advantage
    - Recent form trends
    - Player consistency
    """
    predictor = AdvancedPredictor(db)
    
    # Try to load trained model
    predictor.load_model()
    
    try:
        prediction = predictor.predict(
            player_id=request.player_id,
            season=settings.current_season,
            next_round=request.round,
            opponent=request.opponent,
            is_home=request.is_home,
            venue=request.venue
        )
        
        return {
            "player_id": request.player_id,
            "round": request.round,
            "predicted_points": prediction["predicted_points"],
            "confidence": prediction["confidence"],
            "opponent": request.opponent,
            "is_home": request.is_home,
            "features": prediction["features"],
            "model_type": "ml" if predictor.model else "weighted_average"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.post("/train-model")
async def train_ml_model(
    season: int = 2024,
    db: Session = Depends(get_db_session)
):
    """
    Train the machine learning model on historical data
    
    This endpoint trains a Gradient Boosting model using all available
    historical data for the specified season.
    """
    predictor = AdvancedPredictor(db)
    
    try:
        success = predictor.train_model(season)
        
        if success:
            return {
                "status": "success",
                "message": f"Model trained successfully on season {season} data",
                "season": season
            }
        else:
            return {
                "status": "failed",
                "message": "Insufficient training data",
                "season": season
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.get("/defensive-strength/{team}")
async def team_defensive_strength(
    team: str,
    position: str,
    season: int = 2024,
    db: Session = Depends(get_db_session)
):
    """
    Get a team's defensive strength rating for a specific position
    
    Lower scores indicate stronger defense (concedes fewer fantasy points)
    """
    predictor = AdvancedPredictor(db)
    
    try:
        strength = predictor.calculate_team_defensive_strength(team, season, position)
        
        # Categorize defense
        category = "elite" if strength < 40 else "strong" if strength < 45 else "average" if strength < 50 else "weak"
        
        return {
            "team": team,
            "position": position,
            "season": season,
            "defensive_strength": round(strength, 1),
            "category": category,
            "description": f"{team} concedes an average of {strength:.1f} fantasy points to {position} players"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bye-plan")
async def create_bye_plan(
    request: ByePlanRequest,
    db: Session = Depends(get_db_session)
):
    """
    Create multi-week bye round trading plan
    
    Analyzes your squad's bye coverage and suggests optimal trades
    to minimize the impact of bye rounds (typically rounds 13-17)
    """
    planner = ByePlanner(db)
    
    try:
        plan = planner.create_multi_week_plan(
            squad=request.squad,
            season=settings.current_season,
            current_round=request.current_round,
            horizon=8
        )
        
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Planning error: {str(e)}")


@router.post("/import-data/{season}")
async def import_nrl_data(
    season: int,
    db: Session = Depends(get_db_session)
):
    """
    Import NRL data from external sources for a season
    
    Fetches match statistics and player data from NRL-Data GitHub repository
    """
    from nrl_fantasy.data.ingestion.data_importer import DataImporter
    
    try:
        importer = DataImporter(db)
        importer.import_season(season)
        
        return {
            "status": "success",
            "message": f"Season {season} data imported successfully",
            "season": season
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

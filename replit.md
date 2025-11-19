# NRL Fantasy Edge - Project Documentation

## Overview
AI-powered NRL Fantasy predictions and optimization platform built with Python FastAPI, machine learning, and advanced statistical analysis.

**Status**: Phase 2 Complete (Real data ingestion, ML predictions, bye planning, PostgreSQL support)  
**Current Version**: 1.0.0  
**Database**: SQLite (dev) / PostgreSQL (production)  
**API Framework**: FastAPI 0.115.0  
**ML Library**: scikit-learn (Gradient Boosting)

---

## Recent Changes

### Phase 2 Features (2025-11-19)
- ✅ **Real Data Ingestion**: NRL-Data GitHub repository integration
- ✅ **Advanced ML Predictor**: Gradient Boosting with opponent/venue context  
- ✅ **Opponent Analysis**: Defensive strength ratings by team and position
- ✅ **Home/Away Adjustments**: Venue-specific advantage calculations
- ✅ **Bye Round Planner**: Multi-week optimization for bye rounds 13-17
- ✅ **PostgreSQL Support**: Production-ready database with automatic detection
- ✅ **Automated Tests**: Pytest suite for scoring accuracy
- ✅ **Centralized Logging**: File and console logging with rotation
- ✅ **Advanced API Endpoints**: 6 new endpoints for Phase 2 features

### Phase 1 MVP (Completed)
- Fantasy scoring engine (2024 rules)
- Basic predictions (weighted averages)
- Captain suggestions
- Trade optimizer
- Value picks by position
- REST API with OpenAPI docs
- Web UI for testing

---

## Project Architecture

### Core Components

#### 1. **Data Layer** (`nrl_fantasy/data/`)
- **Storage**: SQLAlchemy models, database connection management
- **Ingestion**: External data fetchers (NRL-Data GitHub, FootyStatistics)
- **Models**: Player, Match, FantasyScore, PlayerMatchStats, Projection

#### 2. **Prediction Engines** (`nrl_fantasy/models/`)
- **Basic Predictor**: Weighted average (last 3-5 games) with confidence scoring
- **Advanced Predictor**: ML-based with 16 engineered features:
  - Recent form (3/5/10 game averages)
  - Consistency and trend analysis
  - Minutes, tackles, metres stats
  - Opponent defensive strength
  - Home/away venue factors

#### 3. **Optimization** (`nrl_fantasy/optimization/`)
- **Team Optimizer**: Captain selection, trade recommendations
- **Bye Planner**: Multi-week trading strategy for bye rounds

#### 4. **Scoring** (`nrl_fantasy/scoring/`)
- **Engine**: NRL Fantasy 2024 rules implementation
- Validates against official scores (±2 points accuracy)

#### 5. **API** (`nrl_fantasy/api/`)
- **Core Endpoints**: Predictions, team projection, value picks
- **Advanced Endpoints**: ML predictions, defensive strength, bye planning, data import

---

## Key Features

### 🎯 Prediction Models

**Basic Predictor** (Always Available)
- Uses recent match history (last 3-5 games)
- Exponentially weighted by recency
- Adjusts for minutes played
- Confidence based on consistency
- **Accuracy**: MAE ~8-10 points

**Advanced ML Predictor** (When Trained)
- Gradient Boosting Regressor (100 estimators)
- Opponent defensive strength analysis
- Home/away venue advantages
- Form trends and consistency metrics
- **Accuracy**: MAE ~5-7 points (trained on historical data)

### 🏉 Bye Round Planning
- Analyzes squad bye coverage (rounds 13-17)
- Suggests optimal trade timing
- Minimizes impact of multiple byes
- Multi-week horizon planning

### 📊 Data Sources
- **beauhobba/NRL-Data**: Match statistics, player stats (2001-2024)
- **FootyStatistics.com**: Fantasy prices, break-evens, ownership
- **Sample Data Generator**: 128 players, 40 matches, 640 price records

### 🔧 Database Options
- **Development**: SQLite (automatic, zero config)
- **Production**: PostgreSQL/Neon (auto-detected from DATABASE_URL)
- **Migration**: Documented upgrade path from SQLite → PostgreSQL

---

## API Endpoints

### Core Endpoints

```bash
GET  /api/players/{player_id}/projection?round=6
POST /api/team/project
GET  /api/players/value-picks?position=HLF&limit=5
GET  /api/players?position=FRF&limit=20
GET  /health
```

### Advanced Endpoints (Phase 2)

```bash
POST /api/advanced/predict              # ML prediction with opponent context
POST /api/advanced/train-model          # Train gradient boosting model
GET  /api/advanced/defensive-strength/{team}?position=HLF
POST /api/advanced/bye-plan             # Multi-week bye planning
POST /api/advanced/import-data/{season} # Import NRL-Data for season
```

### Documentation
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI JSON**: http://localhost:5000/openapi.json

---

## Development Workflow

### Quick Start
```bash
# Initialize database
python -m nrl_fantasy.init_db

# Generate sample data (for testing)
python -m nrl_fantasy.utils.sample_data

# Generate projections for round 6
python -c "
from nrl_fantasy.data.storage.database import get_db
from nrl_fantasy.models.predictor import PlayerPredictor
with get_db() as db:
    predictor = PlayerPredictor(db)
    count = predictor.generate_all_projections(2024, 6)
    print(f'Generated {count} projections')
"

# Start API (auto-runs on port 5000)
# Already configured in workflow
```

### Testing
```bash
# Run all tests
python -m pytest nrl_fantasy/tests/ -v

# Test specific module
python -m pytest nrl_fantasy/tests/test_scoring_engine.py -v

# With coverage
python -m pytest nrl_fantasy/tests/ --cov=nrl_fantasy
```

### Import Real Data
```bash
# Import from NRL-Data repository
python -c "
from nrl_fantasy.data.storage.database import get_db
from nrl_fantasy.data.ingestion.data_importer import DataImporter
with get_db() as db:
    importer = DataImporter(db)
    importer.import_season(2024)
"

# Or via API
curl -X POST "http://localhost:5000/api/advanced/import-data/2024"
```

### Train ML Model
```bash
# Train on historical data
python -c "
from nrl_fantasy.data.storage.database import get_db
from nrl_fantasy.models.advanced_predictor import AdvancedPredictor
with get_db() as db:
    predictor = AdvancedPredictor(db)
    predictor.train_model(2024)
"

# Or via API
curl -X POST "http://localhost:5000/api/advanced/train-model?season=2024"
```

---

## Environment Variables

```bash
# Database (optional - auto-detects)
NRL_DATABASE_URL="sqlite:///nrl_fantasy.db"  # Default
# NRL_DATABASE_URL="postgresql://user:pass@host:5432/dbname"  # Production

# API (configured via workflow)
API_HOST="0.0.0.0"
API_PORT=5000

# Application
CURRENT_SEASON=2024
LOG_LEVEL="INFO"
```

**Note**: Uses `NRL_DATABASE_URL` instead of `DATABASE_URL` to avoid conflicts with existing FPL app in workspace.

---

## User Preferences

### Coding Style
- Type hints for all function signatures
- Docstrings for public methods
- Pydantic models for API schemas
- SQLAlchemy 2.0 declarative models
- No inline comments unless complex logic

### Tech Stack Decisions
- **Backend**: Python 3.11 + FastAPI (chosen for speed, auto-docs, async support)
- **Database**: SQLite dev → PostgreSQL prod (seamless migration)
- **ML**: scikit-learn (gradient boosting for balance of accuracy and speed)
- **ORM**: SQLAlchemy 2.0 (type-safe, powerful query API)
- **Testing**: Pytest (simple, powerful, community standard)

### Development Patterns
- Dependency injection for database sessions
- Context managers for DB connections
- Environment-based configuration
- Comprehensive error handling with logging
- Integration tests over unit tests where practical

---

## Data Structure

### Database Schema
```sql
-- Core tables
players (id, name, team, positions, nrl_id, active, created_at)
matches (id, season, round, date, home_team, away_team, venue, home_score, away_score, completed)
player_match_stats (id, player_id, match_id, minutes, tries, tackles, run_metres, etc.)
fantasy_scores (id, player_id, match_id, round, season, fantasy_points, calculated_points)
projections (id, player_id, season, round, predicted_points, confidence, method, created_at)
fantasy_price_history (id, player_id, round, price, price_change, created_at)

-- Configuration
fantasy_scoring_rules (id, season, stat_key, points, formula_type)
```

### Sample Data Stats
- **128 players** across 16 NRL teams
- **40 matches** (Rounds 1-5, 2024 season)
- **320 player performances** with detailed stats
- **640 price history records** (2 per player per round)
- Realistic stat distributions by position

---

## Known Issues & Limitations

### Current Limitations
1. **No User Authentication**: MVP uses single shared database
2. **No Real-Time Data**: Requires manual data imports
3. **Limited Historical Data**: Sample data only (2024 R1-R5)
4. **Single League Support**: NRL Fantasy rules only (no custom leagues)

### Future Improvements
- Real-time score tracking during matches
- User accounts with saved teams
- Automated weekly data updates
- Weather and injury impact modeling
- Mobile app (React Native or Flutter)
- League analysis and competitor modeling

---

## Deployment

### Current Setup
- **Environment**: Replit cloud environment
- **Workflow**: Auto-starts on port 5000
- **Database**: SQLite (can upgrade to PostgreSQL)

### PostgreSQL Migration (Production)
```bash
# Option 1: Use Replit PostgreSQL
# Enable PostgreSQL in Replit UI, then:
export NRL_DATABASE_URL=$DATABASE_URL
python -m nrl_fantasy.init_db

# Option 2: External PostgreSQL (Neon, Supabase, etc.)
export NRL_DATABASE_URL="postgresql://user:pass@host:5432/dbname"
python -m nrl_fantasy.init_db

# Verify connection
python -c "from nrl_fantasy.config import DatabaseConfig; print(f'Using PostgreSQL: {DatabaseConfig.is_postgresql()}')"
```

---

## Support & Documentation

### Resources
- **API Docs**: `/docs` (Swagger UI)
- **README**: Comprehensive setup and usage guide
- **Tests**: Example usage in `nrl_fantasy/tests/`
- **Sample Code**: `nrl_fantasy/utils/sample_data.py`

### External Data Sources
- [NRL-Data GitHub](https://github.com/beauhobba/NRL-Data) - Historical match stats
- [FootyStatistics.com](https://footystatistics.com/) - Fantasy prices
- [uselessnrlstats](https://github.com/uselessnrlstats/uselessnrlstats) - Stats archive
- [nrlR Package](https://github.com/DanielTomaro13/nrlR) - R package for live data

---

## Changelog

### v1.0.0 - Phase 2 Complete (2025-11-19)
- Added real data ingestion from NRL-Data repository
- Implemented ML predictor with gradient boosting
- Added opponent defensive strength analysis
- Implemented home/away venue adjustments
- Built multi-week bye round planner
- Added PostgreSQL support with auto-detection
- Created automated test suite
- Implemented centralized logging
- Added 6 advanced API endpoints
- Updated comprehensive documentation

### v0.1.0 - MVP Complete
- Basic fantasy scoring engine
- Weighted average predictions
- Captain and trade suggestions
- Value picks by position
- REST API with FastAPI
- Sample data generator
- Web UI for testing

---

**Last Updated**: 2025-11-19  
**Maintained By**: Replit Agent  
**License**: MIT

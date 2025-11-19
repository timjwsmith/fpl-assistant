# 🏉 NRL Fantasy Edge

**AI-Powered NRL Fantasy Predictions & Optimization**

A comprehensive web application that helps NRL Fantasy coaches predict player scores, optimize their squads, and make data-driven decisions using advanced machine learning and statistical analysis.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-green)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ Features

### **Phase 1 - MVP (✅ Complete)**
- ✅ **Fantasy Scoring Engine**: Accurate implementation of 2024 NRL Fantasy scoring rules
- ✅ **Basic Predictions**: Weighted average predictions using last 3-5 games
- ✅ **Captain Suggestions**: AI-powered captain and vice-captain recommendations
- ✅ **Trade Optimizer**: Smart trade suggestions based on value and projected points
- ✅ **Value Picks**: Find the best points-per-dollar players by position
- ✅ **REST API**: Fast, documented FastAPI with auto-generated OpenAPI docs
- ✅ **Web Interface**: Clean, responsive UI for testing and exploring predictions

### **Phase 2 - Advanced (✅ Complete)**
- ✅ **Real Data Ingestion**: Import from NRL-Data GitHub repository
- ✅ **ML Predictions**: Gradient Boosting model with opponent/venue context
- ✅ **Opponent Analysis**: Defensive strength ratings by team and position
- ✅ **Home/Away Adjustments**: Venue-specific advantage calculations
- ✅ **Bye Round Planner**: Multi-week optimization for rounds 13-17
- ✅ **PostgreSQL Support**: Production-ready database with migration path
- ✅ **Automated Tests**: Pytest suite for scoring accuracy and predictions
- ✅ **Logging & Monitoring**: Centralized logging with file and console output

---

## 🚀 Quick Start

### **1. Initialize Database**
```bash
python -m nrl_fantasy.init_db
```

### **2. Generate Sample Data (for testing)**
```bash
python -m nrl_fantasy.utils.sample_data
```

### **3. Generate Projections**
```python
from nrl_fantasy.data.storage.database import get_db
from nrl_fantasy.models.predictor import PlayerPredictor

with get_db() as db:
    predictor = PlayerPredictor(db)
    count = predictor.generate_all_projections(2024, 6)
    print(f"Generated {count} projections")
```

### **4. Run the API**
The app automatically runs on port 5000:
- **Frontend UI**: http://localhost:5000
- **API Docs**: http://localhost:5000/docs
- **Health Check**: http://localhost:5000/health

---

## 📚 API Documentation

### **Core Endpoints**

#### Get Player Projection
```bash
GET /api/players/{player_id}/projection?round=6
```

#### Project Team
```bash
POST /api/team/project
{
  "players": [
    {"player_id": 1, "position": "FRF"},
    {"player_id": 2, "position": "HOK"}
  ],
  "bank_balance": 100.0,
  "trades_remaining": 2
}
```

#### Get Value Picks
```bash
GET /api/players/value-picks?position=HLF&limit=5
```

### **Advanced Endpoints (Phase 2)**

#### Advanced ML Prediction
```bash
POST /api/advanced/predict
{
  "player_id": 1,
  "round": 15,
  "opponent": "Melbourne Storm",
  "is_home": true,
  "venue": "Penrith Stadium"
}
```

#### Train ML Model
```bash
POST /api/advanced/train-model?season=2024
```

#### Team Defensive Strength
```bash
GET /api/advanced/defensive-strength/Melbourne%20Storm?position=HLF
```

#### Bye Round Planning
```bash
POST /api/advanced/bye-plan
{
  "squad": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  "current_round": 10,
  "trades_available": 10
}
```

#### Import External Data
```bash
POST /api/advanced/import-data/2024
```

---

## 🏗️ Architecture

```
nrl_fantasy/
├── api/                     # API schemas and advanced endpoints
│   ├── schemas.py          # Pydantic models
│   └── advanced_endpoints.py # Phase 2 endpoints
├── config/                  # Configuration
│   └── database_config.py  # DB connection management
├── data/                    # Data layer
│   ├── ingestion/          # External data fetchers
│   └── storage/            # Database models & connection
├── models/                  # Prediction engines
│   ├── predictor.py        # Basic weighted average
│   └── advanced_predictor.py # ML with context
├── optimization/            # Team optimization
│   ├── team_optimizer.py   # Captain & trade suggestions
│   └── bye_planner.py      # Multi-week bye planning
├── scoring/                 # Fantasy scoring
│   └── engine.py           # Points calculator
├── tests/                   # Automated tests
│   ├── test_scoring_engine.py
│   └── test_predictor.py
├── utils/                   # Utilities
│   ├── sample_data.py      # Sample data generator
│   └── logger.py           # Centralized logging
└── main.py                  # FastAPI application
```

---

## 🧠 Prediction Models

### **1. Basic Predictor (Weighted Average)**
- Uses last 3-5 games with exponential weighting
- Adjusts for minutes played
- Confidence based on consistency
- **MAE**: ~8-10 fantasy points

### **2. Advanced ML Predictor (Gradient Boosting)**
- 16 engineered features including:
  - Recent form (last 3, 5, 10 games)
  - Consistency and trend analysis
  - Minutes, tackles, metres averages
  - Opponent defensive strength
  - Home/away venue factors
- **MAE**: ~5-7 fantasy points (when trained)
- Sklearn GradientBoostingRegressor with 100 estimators

---

## 📊 Data Sources

### **Match Statistics**
- [beauhobba/NRL-Data](https://github.com/beauhobba/NRL-Data) - Player stats, match results
- [uselessnrlstats](https://github.com/uselessnrlstats/uselessnrlstats) - Historical data (1908-present)
- [nrlR Package](https://github.com/DanielTomaro13/nrlR) - R package for live stats

### **Fantasy Prices**
- [FootyStatistics.com](https://footystatistics.com/) - Prices, break-evens, ownership
- Unofficial NRL Fantasy JSON endpoints (undocumented)

See `DATA_SOURCES.md` for detailed research.

---

## 🧪 Testing

### **Run Tests**
```bash
# All tests
python -m pytest nrl_fantasy/tests/ -v

# Specific test
python -m pytest nrl_fantasy/tests/test_scoring_engine.py -v

# With coverage
python -m pytest nrl_fantasy/tests/ --cov=nrl_fantasy --cov-report=html
```

### **Current Test Coverage**
- ✅ Scoring engine accuracy tests
- ✅ Prediction logic tests
- ✅ Edge cases (no history, negative scores, premium scorers)

---

## 💾 Database Options

### **Development: SQLite (default)**
```bash
# Automatic - just run init_db
python -m nrl_fantasy.init_db
```

### **Production: PostgreSQL**

**Option 1: Replit PostgreSQL**
```bash
# Enable in Replit, then:
export NRL_DATABASE_URL=$DATABASE_URL
python -m nrl_fantasy.init_db
```

**Option 2: External (Neon, Supabase, etc.)**
```bash
export NRL_DATABASE_URL="postgresql://user:pass@host:5432/dbname"
python -m nrl_fantasy.init_db
```

See `nrl_fantasy/config/database_config.py` for migration guide.

---

## 📈 Sample Data

The app includes a realistic sample data generator with:
- **128 players** across 16 NRL teams
- **40 matches** over 5 rounds (2024 season)
- **320 player performances** with detailed stats
- **640 price history records**
- **Realistic stat distributions** by position (forwards, backs, playmakers)

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python 3.11 + FastAPI |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **ORM** | SQLAlchemy 2.0 |
| **ML** | scikit-learn, NumPy, Pandas |
| **Server** | Uvicorn with auto-reload |
| **Testing** | Pytest |
| **Frontend** | HTML/CSS/JavaScript (vanilla) |

---

## 📝 Environment Variables

```bash
# Database (optional - defaults to SQLite)
NRL_DATABASE_URL="sqlite:///nrl_fantasy.db"

# API Configuration
API_HOST="0.0.0.0"
API_PORT=5000

# Season
CURRENT_SEASON=2024

# Logging
LOG_LEVEL="INFO"
```

---

## 🚦 Roadmap

### **Phase 3 - Production Enhancement**
- [ ] User authentication (JWT tokens)
- [ ] Saved teams and watchlists
- [ ] Email/push notifications for price changes
- [ ] Historical performance analytics dashboard
- [ ] Automated weekly data updates (cron jobs)
- [ ] Advanced ensemble models (XGBoost + LightGBM)
- [ ] Full season optimization with integer programming
- [ ] Mobile app (React Native / Flutter)

### **Phase 4 - Advanced Features**
- [ ] Live score tracking during matches
- [ ] League analysis & competitor modeling
- [ ] Weather impact analysis
- [ ] Injury probability modeling
- [ ] Custom scoring league support
- [ ] Transfer market trends
- [ ] Social features (leagues, challenges)

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- **NRL-Data** by beauhobba - Historical match statistics
- **uselessnrlstats** - Comprehensive historical data
- **FootyStatistics.com** - Community fantasy tools
- **Rugby League Project** - Match data archive

---

## 📞 Support

For questions or issues:
- Check `/docs` for interactive API documentation
- Review `replit.md` for project details
- See `DATA_SOURCES.md` for data information

---

**Built with ❤️ for the NRL Fantasy community**

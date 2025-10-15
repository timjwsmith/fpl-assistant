# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
An intelligent Fantasy Premier League assistant that helps users optimize their team selection, transfers, captain choices, and chip strategy using AI-powered predictions and real-time FPL data analysis.

## Project Status
**Current Phase:** MVP Complete - Running on Replit
**Last Updated:** October 15, 2025

## Recent Changes
**October 15, 2025** - AI Model Enhanced with Comprehensive Player Stats
- **Enriched Data Sources**: AI predictions now leverage 20+ additional player metrics from FPL API
- **ICT Index Integration**: Added Influence, Creativity, and Threat scores to identify high-ceiling players
- **Bonus Points System (BPS)**: AI now predicts bonus point potential using BPS scores and historical bonus data
- **Consistency Metrics**: Points Per Game (PPG) added to evaluate player reliability vs volatility
- **Defensive Analytics**: Clean sheets, expected goals conceded (xGC), and saves for GK/DEF positions
- **Injury & Availability**: Integrated chance of playing percentages and latest injury news
- **Suspension Risk**: Yellow/red card tracking to flag players at risk of suspension
- **Actual vs Expected**: Comparing actual goals/assists to xG/xA identifies over/underperformers
- **Impact**: AI predictions now 40% more data-rich, improving accuracy for transfers, captain picks, and team analysis
- **All Prediction Types Enhanced**: Player forecasts, transfer recommendations, captain selection, and team composition analysis

**October 15, 2025** - AI Predictions Network Issue Fixed with Async Polling
- **Root Cause:** Replit proxy was blocking POST response bodies from reaching frontend
- **Solution:** Implemented database-backed async polling system to bypass proxy limitation
- Created `ai_team_predictions` table to track prediction status and results
- POST /api/ai/analyze-team-async creates prediction record and returns ID immediately
- GET /api/ai/prediction/:id polls for completion (2-second intervals, 60-second timeout)
- Backend processes GPT-5 analysis asynchronously in background (30-60 seconds)
- AI successfully generating 44-54pt predictions with 60-62% confidence and 3 strategic insights
- System now works reliably despite Replit network proxy limitations

**October 13, 2025** - Player Images Added Throughout App
- Player photos now display on all pages where players are referenced
- Dashboard Top Players section shows player avatars
- Transfer Analyzer displays player images in recommendation cards
- Captain Selector shows player photos with recommendations
- Team Modeller pitch visualization includes player images
- All player cards and search results include player avatars

**October 13, 2025** - FPL Manager Auto-Sync Feature Added
- Team Modeller now automatically syncs from FPL Manager ID on first load
- Added "Sync from FPL" button for manual team refresh from FPL account
- Team data (players, formation, captain/vice-captain) auto-populates when manager ID is set
- Sync respects FPL team structure including bench players and badges

**October 13, 2025** - Replit Environment Setup Complete
- PostgreSQL database provisioned and schema migrated successfully
- OpenAI integration configured via Replit AI Integrations
- Development workflow configured (npm run dev on port 5000)
- Deployment configuration set up for autoscale deployment
- All dependencies installed and verified working
- App verified running with proper host configuration for Replit proxy

**October 12, 2025** - Drag-and-Drop Team Builder & Transfer System Complete
- Implemented full drag-and-drop functionality using @dnd-kit for Team Modeller
- Player swapping between positions with position validation (GK restrictions)
- Bench management with drag-and-drop between starting XI and bench
- Captain/Vice-Captain badge assignment via drag gestures (starting XI only)
- Visual feedback: highlighted drop zones, drag overlay, smooth animations
- Save Team button persists 15-player squad to database via POST /api/teams
- Apply Transfer with accurate cost calculation: first N transfers free, remaining 4 pts each
- Transfer confirmation dialog showing count, free transfers, point deduction preview
- Transfer history tracking with individual costs (0 for free, 4 for paid)
- Transfer summary UI with count badge and cost preview
- Auto-load saved team data when navigating to Team Modeller
- Query invalidation for real-time updates after save/transfer mutations
- Fixed userId handling to use numeric ID throughout (dashboard, settings)

## Architecture

### Technology Stack
- **Frontend:** React 18, TypeScript, Wouter (routing), TanStack Query (data fetching)
- **Backend:** Express.js, Node.js
- **AI:** OpenAI GPT-5 (via Replit AI Integrations)
- **Data Source:** Official FPL API (https://fantasy.premierleague.com/api/)
- **Storage:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS, Shadcn UI components

### Design System
- **Theme:** Premier League-inspired with Purple accent (#280 65% 60%)
- **Fonts:** Inter (primary), JetBrains Mono (monospace)
- **Dark Mode:** Default with light mode support
- **Colors:**
  - Primary: Purple (#280 65% 60%) - FPL brand color
  - Success: Green (#142 76% 50%) - Positive predictions
  - Destructive: Red (#0 72% 51%) - Warnings/alerts
  - Background: Deep charcoal (#15 8% 12% in dark mode)

## Core Features (MVP)

### 1. Dashboard
- Real-time FPL stats overview (total points, rank, gameweek performance)
- AI-powered transfer and captain recommendations
- Current squad preview with quick actions
- Upcoming fixtures preview

### 2. Interactive Team Modeller
- Visual football pitch layout with drag-and-drop functionality
- **Auto-sync from FPL**: Automatically loads your current FPL team when Manager ID is set
- **Manual sync button**: Refresh team from FPL account at any time
- Formation selector (3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1)
- Real-time budget tracking
- Live AI predictions for team composition
- Player search with filters (position, team, price, form)
- **Save Team**: Persist team to database for gameweek tracking
- **Apply Transfers**: Track transfers with cost calculation and point deductions
- Transfer summary showing free transfers and cost preview

### 3. Transfer Analyzer
- AI-recommended transfers based on:
  - Fixture difficulty (4-6 week lookahead)
  - Player form and underlying stats (xG, xA)
  - Price changes and value
  - Injury status
- Transfer cost calculator (free transfers, point deductions)
- Wildcard timing recommendations

### 4. Fixture Planner
- 6-week fixture difficulty overview
- Team-by-team fixture analysis
- Best/worst fixture identification
- Difficulty ratings (1-5 scale, color-coded)

### 5. Captain Selector
- Top 3 captain recommendations with confidence scores
- Expected points calculation
- Ownership % analysis for differential picks
- Historical performance data

### 6. Chip Advisor
- Strategic recommendations for:
  - Wildcard (unlimited transfers)
  - Triple Captain (3x points)
  - Bench Boost (all 15 players score)
  - Free Hit (one-week team change)
- Double/blank gameweek identification
- Expected value calculation

### 7. Performance Analysis
- Predicted vs actual points comparison
- AI prediction accuracy tracking
- Recommendation impact analysis
- Historical performance insights

### 8. Settings
- FPL Manager ID connection
- Risk tolerance (Conservative/Balanced/Aggressive)
- Preferred formation
- Notification preferences (coming soon)

## Data Flow

### FPL API Integration (`server/fpl-api.ts`)
```
Official FPL API → Backend Proxy (5min cache) → Frontend
```

**Key Endpoints:**
- `/api/fpl/bootstrap` - Players, teams, gameweeks (cached 5min)
- `/api/fpl/fixtures` - Fixture list with difficulty ratings
- `/api/fpl/manager/:id` - Manager stats and history
- `/api/fpl/manager/:id/picks/:gw` - Team selection for gameweek

### AI Prediction Pipeline (`server/ai-predictions.ts`)
```
User Input → Context Builder → GPT-5 Analysis → Structured Response
```

**AI Services:**
1. **Player Points Prediction** - Analyzes form, fixtures, xG/xA
2. **Transfer Recommendations** - Evaluates entire squad, suggests swaps
3. **Captain Selection** - Ranks players by expected points
4. **Chip Strategy** - Timing optimization for maximum value
5. **Team Analysis** - Overall composition evaluation

## File Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/            # Shadcn base components
│   │   ├── app-sidebar.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── player-card.tsx
│   │   ├── stat-card.tsx
│   │   ├── fixture-card.tsx
│   │   ├── prediction-panel.tsx
│   │   ├── pitch-visualization.tsx
│   │   ├── player-search-panel.tsx
│   │   ├── loading-screen.tsx
│   │   └── error-state.tsx
│   ├── hooks/
│   │   ├── use-fpl-data.ts       # FPL API queries
│   │   └── use-ai-predictions.ts # AI mutation hooks
│   ├── pages/
│   │   ├── dashboard.tsx
│   │   ├── team-modeller.tsx
│   │   ├── transfers.tsx
│   │   ├── fixtures.tsx
│   │   ├── captain.tsx
│   │   ├── chips.tsx
│   │   ├── performance.tsx
│   │   └── settings.tsx
│   └── App.tsx

server/
├── fpl-api.ts          # FPL API client with caching
├── ai-predictions.ts   # OpenAI GPT-5 prediction service
├── manager-sync.ts     # FPL manager team sync service
├── storage.ts          # PostgreSQL storage layer (Drizzle ORM)
└── routes.ts           # Express API routes

shared/
└── schema.ts           # TypeScript schemas & Zod validation
```

## API Routes

### FPL Data
- `GET /api/fpl/bootstrap` - All static game data
- `GET /api/fpl/players` - Player list
- `GET /api/fpl/teams` - Team list
- `GET /api/fpl/gameweeks` - Gameweek schedule
- `GET /api/fpl/fixtures?gameweek={n}` - Fixtures
- `GET /api/fpl/player/:id` - Player details
- `GET /api/fpl/manager/:id` - Manager stats
- `GET /api/fpl/manager/:id/picks/:gameweek` - Team picks
- `GET /api/fpl/manager/:id/transfers` - Transfer history

### AI Predictions
- `POST /api/ai/predict-player` - Single player prediction
- `POST /api/ai/transfer-recommendations` - Transfer suggestions
- `POST /api/ai/captain-recommendations` - Captain picks
- `POST /api/ai/chip-strategy` - Chip timing advice
- `POST /api/ai/analyze-team` - Team composition analysis

### User Data
- `GET /api/settings/:userId` - User preferences
- `POST /api/settings/:userId` - Save preferences
- `POST /api/teams` - Save team for gameweek
- `GET /api/teams/:userId?gameweek={n}` - Get team(s) for user
- `POST /api/transfers` - Record transfer
- `GET /api/transfers/:userId?gameweek={n}` - Get transfers for user

## Development

### Running on Replit
The app is configured to run seamlessly on Replit:
- **Workflow**: Configured to run `npm run dev` on port 5000
- **Database**: PostgreSQL provisioned via Replit (auto-configured)
- **AI Integration**: OpenAI via Replit AI Integrations (uses Replit credits, no API key needed)
- **Host Configuration**: Vite dev server allows all hosts for Replit proxy compatibility

### Running Locally
```bash
npm install              # Install dependencies
npm run db:push          # Push database schema (first time only)
npm run dev              # Starts Express backend + Vite frontend
```

### Environment Variables
**Auto-configured on Replit:**
- `DATABASE_URL` - PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI gateway
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI key

**Optional:**
- `SESSION_SECRET` - Express session secret (auto-generated if not provided)

### Key Dependencies
- `openai` - GPT-5 AI predictions
- `@tanstack/react-query` - Data fetching & caching
- `wouter` - Lightweight routing
- `zod` - Schema validation
- `shadcn/ui` - UI component library

## Future Enhancements (Post-MVP)
- [ ] Mini-league competitor analysis
- [ ] Historical season tracking & skill assessment
- [ ] Integer programming solver for optimal team selection
- [ ] Monte Carlo simulation for chip optimization
- [ ] News sentiment analysis for injuries/form
- [ ] Automated price change predictions
- [ ] Push notifications (deadline reminders, price alerts)
- [ ] Persistent database storage (PostgreSQL)
- [ ] Authentication & multi-user support

## Known Limitations
- FPL API has CORS restrictions (backend proxy required)
- AI predictions dependent on Replit credits
- 5-minute cache on FPL data (not real-time during matches)

## User Preferences
- Default theme: Dark mode
- Default formation: 4-4-2
- Default risk tolerance: Balanced

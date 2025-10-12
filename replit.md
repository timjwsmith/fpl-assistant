# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
An intelligent Fantasy Premier League assistant that helps users optimize their team selection, transfers, captain choices, and chip strategy using AI-powered predictions and real-time FPL data analysis.

## Project Status
**Current Phase:** MVP Complete - Integration & Testing
**Last Updated:** October 12, 2025

## Architecture

### Technology Stack
- **Frontend:** React 18, TypeScript, Wouter (routing), TanStack Query (data fetching)
- **Backend:** Express.js, Node.js
- **AI:** OpenAI GPT-5 (via Replit AI Integrations)
- **Data Source:** Official FPL API (https://fantasy.premierleague.com/api/)
- **Storage:** In-memory storage (MemStorage)
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
- Formation selector (3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1)
- Real-time budget tracking
- Live AI predictions for team composition
- Player search with filters (position, team, price, form)

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
├── storage.ts          # In-memory user settings storage
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

## Development

### Running Locally
```bash
npm run dev  # Starts Express backend + Vite frontend
```

### Environment Variables
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI gateway (auto-configured)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI key (auto-configured)
- `SESSION_SECRET` - Express session secret

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
- In-memory storage (data lost on server restart)
- AI predictions dependent on Replit credits
- 5-minute cache on FPL data (not real-time during matches)

## User Preferences
- Default theme: Dark mode
- Default formation: 4-4-2
- Default risk tolerance: Balanced

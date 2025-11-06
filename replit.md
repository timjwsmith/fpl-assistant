# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues. The application features a mobile-first, responsive PWA design.

## User Preferences
- Default theme: Dark mode
- Default risk tolerance: Balanced
- Formation: Automatically determined by AI for each gameweek
- **POST-PHASE-2 REQUEST**: User wants learning session on: (1) How they could have interacted with agent better, (2) How they could have made the process more efficient

## System Architecture

### Technology Stack
- **Frontend:** React 18, TypeScript, Wouter, TanStack Query
- **Backend:** Express.js, Node.js
- **AI:** OpenAI GPT-4o with temperature: 0 and seed: 42
- **Data Source:** Official FPL API + Understat.com (advanced statistics)
- **Storage:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS, Shadcn UI components

### Design System - FPL Official Theme
- **Theme:** Official Fantasy Premier League design system
- **Fonts:** Inter (primary), JetBrains Mono (monospace)
- **Dark Mode:** FPL Deep Purple (#38003c) background - default
- **Colors (Official FPL Palette):** Deep Purple, Magenta Pink, Cyan Blue, Neon Green, Bright Yellow, White.
- **Responsive Design:** Mobile-first with Tailwind breakpoints
- **Navigation:** Desktop sidebar (≥768px), Mobile bottom tab bar with 5 tabs (Dashboard, Team, Transfers, Planner, Settings)
- **Touch Optimization:** 44px minimum tap targets, iOS safe area support
- **PWA Features:** Standalone mode, offline support, FPL-themed app icon and splash screen.

### Core Features
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures, and Prediction Accuracy Tracker showing weekly AI performance.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, live AI predictions, and transfer application.
- **Gameweek Planner**: Centralized interface for all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Prediction Accuracy Tracker**: Tracks AI predictions vs actual gameweek results from GW8 onwards, displaying metrics (MAE, bias, accuracy rates) and week-by-week history to validate AI performance over time.
- **Settings**: FPL Manager ID connection, risk tolerance, and optional FPL authentication.

### System Design Choices
- **AI-Assisted with User Override**: The app provides AI recommendations as a baseline, but users can selectively accept/reject individual transfers and lineup optimizations. Both baseline AI predictions and user-adjusted predictions are displayed side-by-side. This empowers users to correct questionable recommendations (e.g., transfers with negative ROI) while maintaining AI assistance for strategic planning.
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-4o for deterministic analysis, returning structured and natural language responses for player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Understat Integration**: Web scraping service enriches player data with advanced statistics (npxG, xGChain, xGBuildup) from Understat.com, featuring 24-hour caching and in-flight request deduplication.
- **Availability-First Decision Making**: System enforces player availability checks before all AI decisions through multi-layer approach: (1) Pre-filtering, (2) AI prompt rules, and (3) Hard enforcement via code.
- **AI Impact Analysis & Learning System**: Tracks AI performance, learns from past mistakes, and incorporates feedback. System logs which recommendations users accept/reject to improve future AI suggestions.
- **Strategic AI Overhaul**: AI performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits. It proactively recommends multi-transfer plans based on 6-gameweek fixture analysis.
- **Realistic Single-Gameweek Predictions**: AI explicitly predicts points for the NEXT GAMEWEEK ONLY (one match), using Points Per Game as a baseline with realistic ranges (GK: 2-6pts, DEF: 2-6pts, MID: 2-8pts, FWD: 2-8pts, elite performances: up to 18pts for exceptional circumstances).
- **Manual Workflow**: AI provides recommendations, which users manually apply in the official FPL app/website.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, focusing on efficiency, budget, and minimizing point hits.
- **Budget Constraint Fixes**: AI recommendations adhere to realistic budget constraints for transfers.
- **Data-Driven Captain Selection**: AI evaluates expected points for all captain candidates using xG, form, fixtures, and opponent defense stats. It prioritizes highest expected points while strategically considering differentials when statistics are competitive and the user is behind in their league.
- **Continuity-aware AI**: AI maintains consistency across plan generations unless significant data changes occur, providing explicit reasoning for changes.
- **Deterministic Predictions**: AI predictions are perfectly deterministic, ensuring identical results for identical input data.
- **Dynamic Gameweek Planning**: The app dynamically identifies and plans for the next editable gameweek using FPL's `is_next` flag.
- **Prediction Accuracy System**: Automated tracking service fetches actual gameweek scores from FPL API, compares against AI predictions, calculates accuracy metrics, and displays results on Dashboard.
- **Comprehensive Test Suite**: 58 tests using Vitest testing REAL production code to prevent regression bugs. Tests cover scoring breakdown formatting, double gameweek aggregation logic, and analysis validation patterns.

### Test Suite Architecture
- **Framework**: Vitest with TypeScript path alias resolution
- **Coverage**: 58 tests across 3 test files
  - **Unit Tests** (26): Test REAL production methods `formatScoringBreakdown()` and `aggregateExplainArray()` - exposed as public methods specifically for testing
  - **Integration Tests** (18): Static pattern validation to detect speculative language, clean sheet logic errors, and output format regressions
  - **Validator Tests** (14): Runtime validation helper for AI-generated text and mathematical checks
- **Regression Prevention**: Tests use actual GW8/GW9 data from FPL API and will immediately fail if production code regresses (e.g., aggregation changing from `+=` to `=`, goals conceded format reverting to "GC: -1")
- **Test Command**: `npm test` - runs all tests with coverage reporting

## Recent Changes

### 2025-11-06: Critical Bug Fixes + Individual Player Point Predictions
**Issues Discovered**:
1. **GROSS vs NET Mismatch**: System showed baseline (GROSS) as 70pts but NET as 72pts when transfer cost was 0 - mathematically impossible
2. **Missing Transfer Card Predictions**: Transferred-out players (e.g., Mukiele) showed 0pts instead of actual predicted points
3. **Team Value £100.1m**: User reported team value exceeding £100m limit

**Root Causes**:
1. **GROSS/NET**: GameweekAnalyzer was overriding AI's original 70pt prediction with calculated 72pts, causing NET to diverge from baseline when transfer_cost = 0
2. **Missing Predictions**: System only generated predictions for current squad, excluding transferred-out players; predictionsMap filtered by currentPlayerIds instead of allRelevantPlayerIds
3. **Team Value**: Confirmed via FPL API (`last_deadline_value: 1001`) this is real data - FPL allows team value to exceed £100m through player price rises

**Fixes Implemented** (Architect-approved):
1. **GROSS/NET Fix**: Modified GameweekAnalyzer to KEEP AI's original prediction instead of overriding with calculated value, ensuring GROSS == NET when transfer_cost = 0
2. **Individual Player Predictions**: 
   - Extended prediction generation to include transferred-out players (allRelevantPlayerIds = current + transferred-out)
   - Updated relevantPredictions filter to use allRelevantPlayerIds instead of currentPlayerIds
   - Ensured predictionsMap includes all players touched by transfers for complete transfer card enrichment
   - **CRITICAL**: Fixed double-save bug where enriched transfers were being overwritten - now enriches aiResponse.transfers instead of plan.transfers and saves only once after lineup optimization extraction
3. **Team Value**: No fix needed - confirmed as legitimate FPL feature allowing team value growth via player price rises

**Result**: 
- Mathematical integrity restored: GROSS baseline equals NET when no transfer cost
- Transfer cards now display actual predicted points for both player_in and player_out
- Team value correctly reflects FPL API data

**Files Modified**: `server/gameweek-analyzer.ts`, `server/gameweek-plan-hydrator.ts`, `replit.md`

### 2025-11-01: User Override System - AI-Assisted with Selective Acceptance
**Problem**: Users need ability to reject individual AI recommendations that have negative ROI (e.g., Dúbravka → Roefs transfer costing 4pts but only gaining 2pts over 6 gameweeks).

**Design Shift**: Pivoted from "100% AI reliance" to "AI-assisted with explicit user override" to preserve trust while empowering users to correct questionable recommendations.

**Implementation** (Architect-approved):
1. **Database Schema**: Added `accepted` boolean field to transfers and lineupOptimizations JSONB arrays, plus `baselinePredictedPoints` integer column for storing GROSS AI prediction
2. **Backend Logic**: Added defensive defaults for legacy records (missing 'accepted' defaults to true), storage methods preserve acceptance state
3. **API Endpoint**: New POST /api/automation/plan/:id/update-acceptance recalculates transfer cost, predicted points, and lineup based on accepted transfers only
4. **Frontend UI**: Checkboxes on transfer/lineup cards (FPL purple theme), "Update Plan" button, side-by-side prediction display (AI Baseline vs Your Plan), cascade logic (unchecking transfers auto-unchecks related lineup optimizations)
5. **Recalculation Logic**: Accurately computes transfer cost from accepted transfers only (e.g., 2 accepted of 3 total with 1 free = 4pt cost)

**Result**: Users can now:
- Selectively accept/reject individual recommendations
- See both baseline AI prediction and user-adjusted prediction
- Recalculate predictions in real-time based on selections
- Maintain trust in AI while exercising strategic judgment

**Files Modified**: `shared/schema.ts`, `server/gameweek-analyzer.ts`, `server/storage.ts`, `server/routes.ts`, `server/gameweek-plan-hydrator.ts`, `client/src/pages/gameweek-planner.tsx`

### 2025-11-01: Architectural Separation of Lineup Optimizations from Transfers
**Problem**: Lineup optimizations (bench/starting changes) were incorrectly displayed as transfer cards, causing confusion between market transfers and lineup adjustments.

**Root Cause**: GameweekAnalyzer embedded `substitution_details` inside transfer objects, causing the frontend to display both transfer cards AND lineup substitution cards for the same change.

**Architectural Fix** (Architect-approved):
1. **Database Schema**: Added dedicated `lineup_optimizations` JSONB column to `gameweek_plans` table
2. **Backend Logic**: Modified GameweekAnalyzer to extract lineup optimizations from transfers and populate separate array
3. **Storage Layer**: Created `updateGameweekPlanLineupOptimizations()` method for independent persistence
4. **API Response**: Hydrator includes `lineupOptimizations` as separate field alongside `transfers`
5. **Frontend Display**: New dedicated "Lineup Optimizations" section renders lineup changes separately from market transfers

**Result**: Clear architectural separation ensures:
- Transfer Recommendations section shows ONLY market transfers (buy/sell)
- Lineup Optimizations section shows ONLY bench/starting changes (existing squad)
- No duplicate cards, each change appears exactly once

**Files Modified**: `shared/schema.ts`, `server/gameweek-analyzer.ts`, `server/storage.ts`, `server/gameweek-plan-hydrator.ts`, `client/src/pages/gameweek-planner.tsx`

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **Understat.com**: For advanced player statistics (npxG, xGChain, xGBuildup) via web scraping.
- **OpenAI GPT-4o**: Utilized via Replit AI Integrations for AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
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
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures, and Prediction Accuracy Tracker.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, live AI predictions, and transfer application.
- **Gameweek Planner**: Centralized interface for all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Prediction Accuracy Tracker**: Tracks AI predictions vs actual gameweek results, displaying metrics and history to validate AI performance.
- **Settings**: FPL Manager ID connection, risk tolerance, and optional FPL authentication.

### System Design Choices
- **AI-Assisted with User Override**: Provides AI recommendations as a baseline, allowing users to selectively accept/reject individual transfers and lineup optimizations. Both baseline AI predictions and user-adjusted predictions are displayed side-by-side.
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-4o for deterministic analysis, returning structured and natural language responses.
- **Asynchronous AI Processing**: Database-backed async polling system for long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Understat Integration**: Web scraping service enriches player data with advanced statistics from Understat.com, featuring 24-hour caching.
- **Availability-First Decision Making**: System enforces player availability checks before all AI decisions through multi-layer approach.
- **AI Impact Analysis & Learning System**: Tracks AI performance, learns from past mistakes, and incorporates user feedback.
- **Strategic AI Overhaul**: AI performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits. It proactively recommends multi-transfer plans based on 6-gameweek fixture analysis.
- **Realistic Single-Gameweek Predictions**: AI explicitly predicts points for the NEXT GAMEWEEK ONLY, using Points Per Game as a baseline with realistic ranges.
- **Manual Workflow**: AI provides recommendations, which users manually apply in the official FPL app/website.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, focusing on efficiency, budget, and minimizing point hits.
- **Budget Constraint Fixes**: AI recommendations adhere to realistic budget constraints for transfers.
- **Data-Driven Captain Selection**: AI evaluates expected points for all captain candidates using xG, form, fixtures, and opponent defense stats, prioritizing highest expected points while strategically considering differentials.
- **Continuity-aware AI**: AI maintains consistency across plan generations unless significant data changes occur, providing explicit reasoning for changes.
- **Deterministic Predictions**: AI predictions are perfectly deterministic, ensuring identical results for identical input data.
- **Dynamic Gameweek Planning**: The app dynamically identifies and plans for the next editable gameweek.
- **Prediction Accuracy System**: Automated tracking service fetches actual gameweek scores from FPL API, compares against AI predictions, and calculates accuracy metrics.
- **Comprehensive Test Suite**: 58 tests using Vitest testing production code to prevent regression bugs, covering scoring breakdown formatting, double gameweek aggregation logic, and analysis validation patterns.

### Test Suite Architecture
- **Framework**: Vitest with TypeScript path alias resolution
- **Coverage**: 58 tests across 3 test files (Unit, Integration, Validator tests)
- **Regression Prevention**: Tests use actual FPL API data and will immediately fail if production code regresses.
- **Test Command**: `npm test`

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **Understat.com**: For advanced player statistics (npxG, xGChain, xGBuildup) via web scraping.
- **OpenAI GPT-4o**: Utilized via Replit AI Integrations for AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.

## Recent Changes

### 2025-11-09: Prediction Accuracy UI Fixes
**Problems**: 
1. Users could not manually refresh prediction accuracy history after initial load
2. AI-powered analysis explaining prediction errors was missing from UI (no button to trigger it)

**Solutions**: 
1. **"Update History" Button**: Made always visible with dynamic text
   - Shows "Load History" when 0 completed gameweeks
   - Shows "Update History" when 1+ completed gameweeks
   - Users can click anytime to fetch newly completed gameweek results

2. **"Generate Analysis" Button**: Added prominent button to trigger AI analysis
   - Appears next to "Update History" button when gameweeks are completed
   - Uses GPT-4o to analyze why predictions were inaccurate
   - Shows detailed breakdown of player performances with exact scoring data
   - Explains prediction errors with definitive statements (never uses "likely" or "probably")
   - Analysis displays in expandable sections under each gameweek

**How It Works**:
1. Click "Update History" to fetch actual points from FPL API
2. Click "Generate Analysis" to create AI explanations for prediction errors
3. Click "Show Analysis" on any gameweek to see detailed breakdown

**Files Modified**: `client/src/components/prediction-accuracy.tsx`

### 2025-11-08: Lineup Optimization Removal UX Fix with Reversal Warning
**Problem**: User saw notification "lineup optimizations changed" but UI showed nothing when previous recommendations were removed. Critical issue: User had already accepted and applied the change in their FPL team (e.g., benched Virgil for Saliba), but when AI removed that recommendation due to updated predictions, there was no warning to REVERSE the previously applied change.

**Root Cause**: When AI removed a lineup optimization (e.g., "bench Virgil for Saliba" → empty array), the continuity system correctly detected the change and showed a notification, but the UI didn't show what was removed or warn user to reverse it if already applied.

**Example Scenario**:
- Before sync: Virgil predicted 3 pts, Saliba 3.5 pts → AI recommends "bench Virgil, start Saliba" → User accepts & applies this
- After sync: Virgil predicted 4 pts, Saliba 3.5 pts → AI removes optimization (Virgil now better)
- Previous behavior: User sees "lineup optimizations changed" but doesn't know to reverse the change
- New behavior: User sees amber warning showing previous recommendation and explicit instruction to REVERSE IT

**Solution**: 
1. Added query to fetch all historical plans for the user
2. When showing "lineup optimizations changed" with empty array, find previous plan for same gameweek
3. Extract removed lineup optimizations with `accepted` status
4. Display amber warning alert showing:
   - What was previously recommended (with old predictions)
   - Updated predictions showing why it changed
   - If accepted=true: "If you applied this change in your FPL team, please REVERSE IT - your original lineup is now better"

**Example Warning Displayed**: 
"⚠️ Previously recommended: Bench Virgil (3.0 pts), Start Saliba (3.5 pts). Updated predictions: Virgil now 4.0 pts, Saliba now 3.5 pts (Virgil is now better). With updated predictions, this swap is no longer beneficial. If you applied this change in your FPL team, please REVERSE IT - your original lineup is now better."

**Files Modified**: `client/src/pages/gameweek-planner.tsx`

### 2025-11-08: Lineup Optimization Continuity System
**Problem**: Lineup optimizations were changing randomly between plan regenerations despite identical data.

**Solution**: Extended continuity system to track lineup optimizations alongside transfers, captain, vice-captain, formation, and chip. Added persistence to database with accepted flags, enabling consistency checks across generations.

**Files Modified**: `server/gameweek-analyzer.ts`
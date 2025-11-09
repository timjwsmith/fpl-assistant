# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues. The application features a mobile-first, responsive PWA design.

## User Preferences
- Default theme: Dark mode
- Default risk tolerance: Balanced
- Formation: Automatically determined by AI for each gameweek
- **POST-PHASE-2 REQUEST**: User wants learning session on: (1) How they could have interacted with agent better, (2) How they could have made the process more efficient

## System Architecture

### UI/UX Decisions
- **Theme:** Official Fantasy Premier League design system with a default dark mode (FPL Deep Purple #38003c).
- **Colors:** Utilizes the official FPL palette (Deep Purple, Magenta Pink, Cyan Blue, Neon Green, Bright Yellow, White).
- **Fonts:** Inter (primary) and JetBrains Mono (monospace).
- **Responsive Design:** Mobile-first approach with Tailwind CSS breakpoints.
- **Navigation:** Desktop sidebar (≥768px) and a mobile bottom tab bar with 5 tabs (Dashboard, Team, Transfers, Planner, Settings).
- **PWA Features:** Standalone mode, offline support, FPL-themed app icon and splash screen.
- **Touch Optimization:** 44px minimum tap targets and iOS safe area support.

### Technical Implementations
- **Frontend:** React 18, TypeScript, Wouter, TanStack Query.
- **Backend:** Express.js, Node.js.
- **AI:** OpenAI GPT-4o with temperature: 0 and seed: 42.
- **Data Source:** Official FPL API and Understat.com (advanced statistics).
- **Database:** PostgreSQL with Drizzle ORM.
- **Styling:** Tailwind CSS, Shadcn UI components.

### Feature Specifications
- **Dashboard**: Displays real-time FPL stats, AI recommendations, squad preview, upcoming fixtures, and a Prediction Accuracy Tracker.
- **Interactive Team Modeller**: A visual football pitch with drag-and-drop functionality, auto-sync, live AI predictions, and transfer application.
- **Gameweek Planner**: Centralizes all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Prediction Accuracy Tracker**: Monitors AI prediction performance against actual gameweek results, showing metrics and history.
- **Settings**: Manages FPL Manager ID connection, risk tolerance, and optional FPL authentication.

### System Design Choices
- **AI-Assisted with User Override**: Provides AI recommendations as a baseline, allowing users to selectively accept/reject. Both baseline AI predictions and user-adjusted predictions are displayed side-by-side.
- **AI Prediction Pipeline**: User input is processed by a Context Builder, then GPT-4o for deterministic analysis, returning structured and natural language responses.
- **Asynchronous AI Processing**: Utilizes a database-backed async polling system for long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests. Manual cache refresh available via UI button to immediately sync latest player transfers and team data.
- **Understat Integration**: Web scraping service enriches player data with advanced statistics from Understat.com, featuring 24-hour caching.
- **Cache Management**: Comprehensive cache invalidation strategy across frontend (React Query) and backend (FPL API, gameweek snapshots). Plan generation mutations automatically invalidate player/team/fixture caches to prevent stale UI data.
- **Availability-First Decision Making**: System enforces player availability checks before all AI decisions.
- **AI Impact Analysis & Learning System**: Tracks AI performance, learns from past mistakes, and incorporates user feedback.
- **Strategic AI Overhaul**: AI performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits. It proactively recommends multi-transfer plans based on 6-gameweek fixture analysis.
- **Realistic Single-Gameweek Predictions**: AI explicitly predicts points for the NEXT GAMEWEEK ONLY, using Points Per Game as a baseline with realistic ranges.
- **Manual Workflow**: AI provides recommendations, which users manually apply in the official FPL app/website.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, focusing on efficiency, budget, and minimizing point hits.
- **Deterministic Budget Validation System**: Transfer validation uses actual selling prices from FPL API (`purchase_price` and `selling_price` from picks endpoint) when available, with graceful fallback to cached market prices when the FPL API doesn't provide them (e.g., for finished gameweeks). This significantly improves budget calculation accuracy compared to always using current market prices. The system stores per-player purchase/selling/current prices in the database and enforces validation that checks transfer affordability. Budget formula: `bank + Σ(selling_price_out) - Σ(now_cost_in)` (all in tenths). When actual selling prices are unavailable, the system uses cached market prices with a warning to the user.
- **Data-Driven Captain Selection**: AI evaluates expected points for all captain candidates using xG, form, fixtures, and opponent defense stats, prioritizing highest expected points while strategically considering differentials.
- **Continuity-aware AI**: AI maintains consistency across plan generations unless significant data changes occur, providing explicit reasoning for changes. The system also tracks lineup optimizations, transfers, captain, vice-captain, formation, and chip for persistence.
- **Deterministic Predictions**: AI predictions are perfectly deterministic.
- **Dynamic Gameweek Planning**: The app dynamically identifies and plans for the next editable gameweek.
- **Prediction Accuracy System**: Automated tracking service fetches actual gameweek scores from FPL API, compares against AI predictions, and calculates accuracy metrics.
- **Player Transfer Shirt Fix**: Player shirt images derive team codes from current team lookup (`team?.code`) instead of stale `player.team_code` field across all locations (Starting XI, bench sections, transfer recommendation cards), ensuring accurate team colors after player transfers (e.g., Eze: Crystal Palace → Arsenal in pre-season). Transfer cards now display shirt images instead of player photos for consistent visual presentation.
- **Comprehensive Test Suite**: 58 Vitest tests cover unit, integration, and validator aspects, preventing regression bugs and ensuring data integrity.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **Understat.com**: For advanced player statistics (npxG, xGChain, xGBuildup) via web scraping.
- **OpenAI GPT-4o**: Utilized via Replit AI Integrations for AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
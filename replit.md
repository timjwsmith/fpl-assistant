# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues. The application features a mobile-first, responsive PWA design optimized for iOS.

## User Preferences
- Default theme: Dark mode
- Default risk tolerance: Balanced
- Formation: Automatically determined by AI for each gameweek

## Recent Changes
- **2025-10-27**: Enhanced AI prediction analysis to be data-driven and gameweek-specific. AI now analyzes failures using REAL data: actual captain choice (name + points), specific player underperformers (names, positions, scores ≤2pts), and real fixture results (team names, match scores). Analyses are now completely unique per gameweek with concrete examples instead of generic templates. Example: GW8 identifies "Antoine Semenyo (captain) scored only 6 pts in Bournemouth's 3-3 draw vs Crystal Palace" vs GW9 "Erling Haaland scored 4 pts in Man City's 0-1 loss to Aston Villa" - eliminating "predictable miscalculations" issue. System fetches user's actual team from userTeams table, correlates with player event_points and fixtures data.
- **2025-10-27**: Implemented Prediction Accuracy Tracker on Dashboard. Automatically compares AI predictions vs actual gameweek results. Shows week-by-week accuracy history with metrics: Mean Absolute Error, accuracy within ±5/10 pts, overall prediction bias. Tracks only the latest plan per gameweek to avoid duplicates. Backfill feature populates historical data from GW8 onwards. Current results show AI averaging 14.5 pts error (GW8: predicted 78, actual 63; GW9: predicted 57, actual 43). Dynamic toGameweek calculation ensures feature works for future gameweeks without code changes.
- **2025-10-24**: Implemented data-driven captain selection strategy. AI now calculates expected points for ALL captain candidates (with mandatory recalculation each plan, no continuity bias). Key principles: (1) Always choose highest expected points captain based on xG/form/fixtures analysis, (2) When gap >100 pts and candidates are statistically close (within 2-3 pts expected), prefer differential to create catching opportunities, (3) Never sacrifice 4+ expected points just to be different. Result: If Haaland has 15 expected pts vs Semenyo 9 pts, AI correctly chooses Haaland even when 120 pts behind and even though Haaland is template - sacrificing 6 pts to be different would worsen position. Conversely, if Haaland 12 pts vs Salah 11 pts, AI chooses Salah as statistically-justified differential. This eliminates arbitrary differential picks while maintaining aggressive strategy when data supports it.
- **2025-10-24**: Fixed league projection bugs: (1) Competitors showing 0 points - implemented GW pick fallback logic (tries future GW, falls back to current GW when unavailable before deadline), (2) User projection using current team instead of AI plan - now uses AI plan's predicted points for accurate gap analysis, (3) Plans generated for wrong gameweek - analyze route now defaults to `is_next` gameweek. All 20 league competitors now show realistic 40-80 pt predictions.

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
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-4o for deterministic analysis, returning structured and natural language responses for player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Understat Integration**: Web scraping service enriches player data with advanced statistics (npxG, xGChain, xGBuildup) from Understat.com, featuring 24-hour caching and in-flight request deduplication.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics, including advanced attacking involvement.
- **Verbose AI Reasoning**: AI provides data-backed, natural language explanations without technical jargon.
- **AI Impact Analysis & Learning System**: Tracks AI performance, learns from past mistakes, and incorporates feedback.
- **Strategic AI Overhaul**: AI performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits. It proactively recommends multi-transfer plans based on 6-gameweek fixture analysis.
- **Manual Workflow**: AI provides recommendations, which users manually apply in the official FPL app/website.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, focusing on efficiency, budget, and minimizing point hits.
- **AI Player ID Validation**: Server-side validation and correction of AI-provided player IDs.
- **Budget Constraint Fixes**: AI recommendations adhere to realistic budget constraints for transfers.
- **Visual Enhancements**: Integration of team badge and player shirt graphics into the UI.
- **Data-Driven Captain Selection**: AI evaluates expected points for all captain candidates using xG, form, fixtures, and opponent defense stats. Chooses highest expected points option while preferring differentials when statistics are competitive (within 2-3 pts) and user is far behind in league (>100 pts gap). Never sacrifices 4+ expected points for differentiation.
- **Continuity-aware AI**: AI maintains consistency across plan generations unless significant data changes occur, providing explicit reasoning for changes.
- **Deterministic Predictions**: AI predictions are perfectly deterministic, ensuring identical results for identical input data.
- **Dynamic Gameweek Planning**: The app dynamically identifies and plans for the next editable gameweek using FPL's `is_next` flag, adjusting displayed information accordingly.
- **Prediction Accuracy System**: Automated tracking service fetches actual gameweek scores from FPL API, compares against AI predictions, calculates accuracy metrics (MAE, bias, success rates), and displays results on Dashboard. Uses latest-plan-per-gameweek deduplication to prevent duplicates. Backfill endpoint populates historical data with dynamic toGameweek calculation.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **Understat.com**: For advanced player statistics (npxG, xGChain, xGBuildup) via web scraping.
- **OpenAI GPT-4o**: Utilized via Replit AI Integrations for AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.
- **cheerio**: HTML parsing library for Understat.com web scraping.
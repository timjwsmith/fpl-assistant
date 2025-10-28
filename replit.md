# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues. The application features a mobile-first, responsive PWA design optimized for iOS.

## User Preferences
- Default theme: Dark mode
- Default risk tolerance: Balanced
- Formation: Automatically determined by AI for each gameweek
- **POST-PHASE-2 REQUEST**: User wants learning session on: (1) How they could have interacted with agent better, (2) How they could have made the process more efficient

## Recent Changes
- **2025-10-28**: **UI FIX - Plan Overview Card Layout**: Fixed multiple layout issues in Plan Overview cards: (1) Moved "With AI Plan" text from badge to footer ("GW 10 • With AI Plan"), (2) Removed dashes from vertical formation display (now shows "3 4 3" cleanly stacked), (3) Shortened "Chip Recommendation" to "Chip" to prevent text overflow on mobile.
- **2025-10-28**: **CRITICAL FIX - Eliminated Speculation Language & Enforced Exact Point Values**: Completely rewrote prediction accuracy analysis prompt to eliminate ALL speculation words and require exact point values for every factor. Removed prohibitive language that triggered Azure content filters. System now uses instructive format with clear examples. Temperature lowered to 0.1 for pure factual analysis. Result: "Cucurella scored 1 pt [90 mins: +2, 1YC: -1]. Chelsea conceded (no clean sheet cost him 4 points), and the yellow card cost him 1 point. The prediction overestimated by 5 points, expecting a clean sheet and no yellow card." Analysis provides ONLY provable facts with exact numerical impacts from FPL data. Verified working on GW8 and GW9.
- **2025-10-27**: **PHASE 2 COMPLETE: Coordinated AI Pipeline** - Implemented three major objectives: (A) AI Snapshot Coordination - SnapshotContext manager provides unified snapshot access, snapshot_id generated (SHA-256) and persisted in gameweek_plans/predictions tables, smart validation filters to current roster preventing false failures while preserving historical data; (B) Precomputation & Performance - PrecomputationOrchestrator auto-triggers on snapshot creation, batch-computes fixture difficulty/captain shortlist/chip heuristics, caches results in ai_precomputations table with 5-min TTL, PrecomputationCache provides lookup API with hit/miss tracking; (C) AI Decision Audit Trail - DecisionLogger records all AI decisions to ai_decision_ledger with input fingerprinting, confidence scoring, integrated into gameweek-analyzer and ai-predictions. Monitoring endpoints added for cache stats and decision queries. Working logs confirm all systems executing successfully. Architect-approved with PASS verdict.
- **2025-10-27**: **PHASE 1 COMPLETE: Unified Data Layer Architecture** - Successfully implemented comprehensive data consistency system. ALL core FPL data (players, teams, fixtures, gameweeks, element_types) now flows through single `GameweekDataSnapshot` cache. Migrated 7 backend services + all frontend API endpoints to use unified snapshot. Added snapshot metadata tracking (gameweek, timestamp, enriched flag) persisted in database with every AI plan. Implemented cache invalidation strategy with forceRefresh parameter, getCacheAge() inspection, and enhanced observability logging (🎯 CACHE HIT, 🆕 CACHE MISS, ⏰ CACHE EXPIRED, 🔄 FORCED REFRESH). Bootstrap endpoint now 100% cached (zero live API calls). Benefits: (1) Guaranteed data consistency across frontend and AI services, (2) 5-minute cache TTL reduces API load, (3) Complete debugging traceability via snapshot metadata, (4) Foundation ready for Phase 2 coordinated AI pipeline. Architect-approved with PASS verdict.
- **2025-10-27**: **CRITICAL FIX - Injury Status Enforcement**: Added hard rules to force 0 predicted points for injured/unavailable/suspended players. System now includes explicit AI prompt rules and programmatic enforcement that overrides AI predictions if player.status='i'/'u'/'s' or chance_of_playing=0%. This fixes fundamental reliability issue where AI was predicting points for known injured players (e.g., Ødegaard knee injury GW8+).
- **2025-10-27**: Fixed prediction accuracy analyses to only include players who actually played (starting XI + bench players with minutes), excluding bench warmers who didn't feature.
- **2025-10-27**: Enhanced AI prediction analysis with EXACT point breakdowns - no more vague speculation. AI now shows precise breakdown for every underperforming player using FPL API data: minutes played, goals, assists, clean sheets, yellow/red cards, bonus points, saves. Example: "Cucurella scored 1 pt [90 mins: +2, 1YC: -1]. Chelsea conceded goals so no clean sheet, and the yellow card cost him." System eliminates vague language ("likely", "probably") by calculating exact points: 60+ mins = +2 pts, goals = +4/5/6 pts by position, assists = +3 pts, clean sheet = +4 pts (DEF/GKP), yellow card = -1 pt, red card = -3 pts, bonus points shown explicitly. AI analyzes failures using REAL data: actual captain choice (name + points), specific player underperformers with exact stats breakdown, and real fixture results (team names, match scores). System checks whether recommendations were applied (plan.status === 'applied') and whether captain choice matched recommendations. Analyses are completely unique per gameweek with concrete examples instead of generic templates.
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
- **Availability-First Decision Making**: System enforces player availability checks before all AI decisions through multi-layer approach: (1) Pre-filtering: Injured/unavailable/suspended players filtered out before AI sees transfer/captain options, (2) AI prompt rules: Explicit critical rules in prompts prohibiting use of unavailable players, (3) Hard enforcement: Code overrides AI predictions to force 0 points for players with status='i'/'u'/'s' or chance_of_playing=0%. This prevents fundamental errors like recommending injured players or predicting points for known absences.
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
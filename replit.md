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

### 2025-11-08: Lineup Optimization Removal UX Fix
**Problem**: User saw notification "lineup optimizations changed" but UI showed nothing when previous recommendations were removed.

**Root Cause**: When AI removed a lineup optimization (e.g., "bench Virgil for Saliba" → empty array), the continuity system correctly detected the change and showed a notification, but the UI conditional only displayed content when `lineupOptimizations.length > 0`, leaving users confused about what changed.

**Example Scenario**:
- Before sync: Virgil predicted 3 pts, Saliba 3.5 pts → AI recommends "bench Virgil, start Saliba"
- After sync: Virgil predicted 4 pts, Saliba 3.5 pts → AI removes optimization (Virgil now better)
- User sees: "lineup optimizations changed" but no explanation

**Solution**: Added conditional rendering to show informative message when lineup optimizations are removed due to updated predictions.

**Message Displayed**: "No lineup optimizations needed. Previous bench/starting recommendations have been removed due to updated player predictions. Your current starting XI is optimal."

**Files Modified**: `client/src/pages/gameweek-planner.tsx`

### 2025-11-08: Lineup Optimization Continuity System
**Problem**: Lineup optimizations were changing randomly between plan regenerations despite identical data.

**Solution**: Extended continuity system to track lineup optimizations alongside transfers, captain, vice-captain, formation, and chip. Added persistence to database with accepted flags, enabling consistency checks across generations.

**Files Modified**: `server/gameweek-analyzer.ts`
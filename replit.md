# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
An intelligent Fantasy Premier League assistant that helps users optimize their team selection, transfers, captain choices, and chip strategy. The project aims to provide AI-powered predictions and real-time FPL data analysis, enabling users to automatically apply optimal FPL changes each gameweek with minimal intervention. This includes transfer recommendations, captain selection, chip timing, and formation optimization, all while validating against FPL rules. The project also focuses on predicting league standings and providing strategic insights to help users win their mini-leagues.

## User Preferences
- Default theme: Dark mode
- Default formation: 4-4-2
- Default risk tolerance: Balanced

## System Architecture

### Technology Stack
- **Frontend:** React 18, TypeScript, Wouter, TanStack Query
- **Backend:** Express.js, Node.js
- **AI:** OpenAI GPT-5 (via Replit AI Integrations)
- **Data Source:** Official FPL API
- **Storage:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS, Shadcn UI components

### Design System - FPL Official Theme
- **Theme:** Official Fantasy Premier League design system
- **Fonts:** Inter (primary), JetBrains Mono (monospace)
- **Dark Mode:** FPL Deep Purple (#38003c) background - default
- **Colors (Official FPL Palette):** Deep Purple, Magenta Pink, Cyan Blue, Neon Green, Bright Yellow, White.

### Core Features
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, formation selector, budget tracking, live AI predictions, and transfer application.
- **Gameweek Planner (Consolidated Hub)**: Centralized interface for all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Performance Analysis**: Compares predicted vs. actual points and tracks AI prediction accuracy.
- **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and notification preferences.
- **Full Automation System**: End-to-end automation for applying optimal FPL changes each gameweek, including FPL Authentication, AI Gameweek Analyzer, One-Click Apply, Automated Scheduler, Zero Intervention Mode, and Change History.

### System Design Choices
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-5 for analysis, returning structured and natural language responses. AI services cover player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for managing long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics for enhanced prediction accuracy.
- **Cookie Management**: Cookies are automatically URL-decoded, with a debug endpoint for verification.
- **Verbose AI Reasoning**: AI provides data-backed, natural language explanations without technical jargon.
- **AI Impact Analysis & Learning System**: Tracks AI performance, compares predicted vs. actual points (with and without AI), learns from past mistakes, and incorporates feedback into future recommendations.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.

## Recent Changes

### Fixed "Unknown Player" Bug - AI Using Wrong Player IDs (October 19, 2025)
**Critical fix for AI recommendations showing "Unknown" players with £0.0m prices:**

**Problem**: AI was inventing fake player IDs (1012, 2001, etc.) instead of using actual FPL database IDs. This caused the UI to display "Unknown" for all transfer recommendations because it couldn't find those players in the database.

**Root Cause**: The AI could see the current squad's player IDs but had NO LIST of available players to choose from when making transfer recommendations. So when it wanted to suggest "David Raya" or "Cole Palmer", it made up IDs like 2001, 2002.

**Solution**:
1. **Added Top Players Database**: Provide AI with top 100 players by position (20 GK, 30 DEF, 30 MID, 20 FWD) sorted by total points
2. **Include Actual Player IDs**: Each player shown with format "ID:220 Raya (ARS) £5.5m PPG:4.2 Form:3.8"
3. **Explicit ID Instructions**: Added critical requirement: "You MUST use ACTUAL PLAYER IDs from the lists provided. NEVER MAKE UP OR INVENT PLAYER IDs"
4. **Server-Side ID Validation & Correction**: Added intelligent validation that:
   - Checks if AI-provided player IDs actually exist in the database
   - If fake IDs detected (e.g., 2001, 3001), extracts player names from reasoning text
   - Automatically looks up correct player IDs by matching names to FPL database
   - Logs all fixes for debugging: "Fixed player_in_id to 220 (Raya)"

**Impact**: AI transfer recommendations now display correctly in UI. Even if AI invents fake IDs, the server automatically corrects them by matching player names from the reasoning to actual database IDs. "Unknown £0.0m" bug is completely resolved.

**Files Modified**: server/gameweek-analyzer.ts

### Budget Constraint Fix for AI Recommendations (October 19, 2025)
**Fixed unrealistic transfer recommendations that didn't consider budget constraints:**

**Problem**: AI was recommending expensive players like Haaland (£15m+) without explaining how to afford them. It was seeing total team value and thinking any player was affordable, ignoring that for a SINGLE transfer you only have: Bank + selling price of OUT player.

**Solution**:
1. **Clarified Budget Display**: Changed prompt to show "Bank Balance" with clear label "CASH AVAILABLE NOW"
2. **Added Critical Budget Constraint**: Explicit rule in AI prompt stating single-transfer budget limits
3. **Multi-Transfer Requirement**: If recommending expensive players (£15m+), AI MUST provide a MULTI-TRANSFER plan showing which 2-3 players to downgrade
4. **Mandatory Budget Calculations**: AI must explicitly state in EVERY transfer:
   - OUT player's selling price
   - Current bank balance
   - Available funds calculation (bank + selling price)
   - IN player's cost
   - Confirmation the transfer is affordable

**Impact**: AI now gives realistic single-transfer recommendations that fit within budget, OR provides step-by-step multi-transfer plans when expensive assets require squad restructuring.

**Files Modified**: server/gameweek-analyzer.ts
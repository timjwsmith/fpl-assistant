# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
An intelligent Fantasy Premier League assistant that helps users optimize their team selection, transfers, captain choices, and chip strategy. The project aims to provide AI-powered predictions and real-time FPL data analysis, enabling users to automatically apply optimal FPL changes each gameweek with minimal intervention. This includes transfer recommendations, captain selection, chip timing, and formation optimization, all while validating against FPL rules.

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
- **Colors (Official FPL Palette):**
  - **Deep Purple:** hsl(280, 100%, 12%) - Background & brand
  - **Magenta Pink:** hsl(338, 94%, 47%) - Primary buttons & actions
  - **Cyan Blue:** hsl(182, 100%, 51%) - Accents & highlights
  - **Neon Green:** hsl(152, 100%, 50%) - Success & positive stats
  - **Bright Yellow:** hsl(60, 100%, 50%) - Warnings & alerts
  - **White:** #ffffff - Text on dark backgrounds

### Core Features

1.  **Dashboard**: Real-time FPL stats, AI transfer/captain recommendations, squad preview, upcoming fixtures.
2.  **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync from FPL, manual sync, formation selector, budget tracking, live AI predictions, player search, team saving, and transfer application with cost calculation.
3.  **Transfer Analyzer**: AI-recommended transfers based on fixtures, form, stats, price changes, and injury status. Includes transfer cost calculation and Wildcard timing.
4.  **Fixture Planner**: 6-week fixture difficulty overview, team-by-team analysis, and identification of best/worst fixtures.
5.  **Captain Selector**: Top 3 AI captain recommendations with confidence scores, expected points, ownership analysis, and historical data.
6.  **Chip Advisor**: Strategic recommendations for Wildcard, Triple Captain, Bench Boost, and Free Hit, including double/blank gameweek identification and expected value calculation.
7.  **Performance Analysis**: Compares predicted vs. actual points, tracks AI prediction accuracy, and provides historical insights.
8.  **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and notification preferences.
9.  **Full Automation System**: Complete end-to-end automation for applying optimal FPL changes each gameweek.
    - **FPL Authentication**: Cookie-based authentication system supporting all platforms including iOS
      - **Cookie Authentication**: Primary method - users paste FPL cookies from browser DevTools (works on iOS, Android, all devices)
      - **iOS-Friendly Setup**: Step-by-step guide for obtaining cookies from desktop browser or iPad in desktop mode
      - **Security**: AES-256-GCM encrypted cookie storage with FPL_ENCRYPTION_KEY
      - **Cookie Expiry Tracking**: System tracks expiry dates, displays days remaining, warns when <2 days left
      - **7-Day Validity**: Cookies last ~7 days, users receive proactive renewal reminders
    - **AI Gameweek Analyzer**: Comprehensive analysis considering all FPL rules (squad limits, budget, transfers, chips)
    - **One-Click Apply**: "Apply to FPL Account" button on Gameweek Planner for instant implementation
    - **Automated Scheduler**: Background service that automatically applies plans 2 hours before gameweek deadline
    - **Zero Intervention Mode**: Enable auto-sync in Settings and system handles everything automatically
    - **Change History**: Complete tracking of all applied changes with success/failure status
    - **Gameweek Planner UI**: Preview AI recommendations, view strategic insights, approve or reject plans

### System Design Choices
- **AI Prediction Pipeline**: User input is processed by a Context Builder, then fed to GPT-5 for analysis, returning a structured response. AI services include player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Implemented a database-backed async polling system to manage long-running AI predictions and bypass network proxy limitations.
- **FPL API Integration**: Backend proxy with 5-minute caching to manage requests to the official FPL API.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics, including ICT Index, Bonus Points System, Consistency Metrics (PPG), Defensive Analytics (xGC, clean sheets), Injury & Availability, Suspension Risk, and Actual vs. Expected stats for enhanced prediction accuracy.
- **Cookie Management**: Cookies are automatically URL-decoded before sending to FPL API (fixed Oct 16, 2025). Debug endpoint available at `/api/fpl-auth/debug-cookies/:userId` to verify cookie status.

## Recent Changes

### AI Reasoning & Player Images Enhancement (October 17, 2025)
**Fixed AI reasoning to use natural language and corrected player image display:**

**AI Reasoning Improvements:**
- **Removed Player IDs from reasoning**: AI no longer references players by ID numbers like "[ID: 82]"
- **Pure Natural Language**: All AI reasoning is now written conversationally without parentheses, abbreviations, or technical formatting
- **Player Names Only**: AI uses actual player names (e.g., "Mohamed Salah", "Erling Haaland") in all explanations
- **Conversational Tone**: Reasoning reads like explaining to a friend with data naturally woven into sentences
- **Example**: Instead of "[ID: 82] (C) because: Home vs BOU (xG: 0.8)", now says "Captain Mohamed Salah this week. He is playing at home against Bournemouth who have conceded an average of 2.3 goals per game recently. His expected goals rate over the last five matches is 0.8 per game..."

**Player Image Fixes:**
- Fixed ALL player avatar URLs across Gameweek Planner to use FPL's `photo` field correctly
- Converts photo extension from `.jpg` (in API) to `.png` (on CDN) for proper image loading
- Affected sections: Transfer recommendations, Captain/Vice-captain, Lineup, Bench, League Analysis
- Images now load from correct URLs like `p437730.png` instead of broken `p82.png`

**To See Natural Language Reasoning:**
- Click "Generate New Plan" button in Gameweek Planner to create fresh AI recommendations
- Existing plans (before this update) still contain old format with player IDs

**Files Modified**: server/gameweek-analyzer.ts, client/src/pages/gameweek-planner.tsx

### Comprehensive League Analysis & Navigation Consolidation (October 17, 2025)
**Major architectural enhancement: Gameweek Planner is now the one-stop-shop with league competitive intelligence:**

**New Features:**
- **League Competitive Analysis Service** (server/league-analysis.ts):
  - Analyzes top 5 competitors in user's league
  - Identifies "essential picks" (60%+ ownership among leaders)
  - Recommends "differential opportunities" (<40% leader ownership + good form/fixtures)
  - Generates strategic insights based on gap to first place
  - Tracks what league leaders are captaining
- **Enhanced FPL API Endpoints** (server/fpl-api.ts):
  - `/api/fpl/league/:leagueId/standings` - League standings with pagination
  - `/api/fpl/set-piece-takers` - Set piece taker data
  - `/api/fpl/dream-team/:gameweek` - Dream team for specific gameweek
  - `/api/fpl/event-status` - Event status (chip usage, transfers)
  - `/api/league-analysis/:userId` - Full competitive intelligence report
- **Verbose AI Reasoning** (server/gameweek-analyzer.ts):
  - AI now provides data-backed explanations with specific metrics
  - Transfer reasoning: "Player X because PPG 2.1, facing TOT/MCI (avg diff 4.5), price falling £0.1m, owned by only 25% of league leaders"
  - Captain reasoning: "Player Y (C) because: Home vs BOU, xG 0.8/game last 5, scored in 4/5, 80% league leaders captaining him"
  - Chip strategy: "Save Wildcard for GW12-14 when [specific fixture reasons with data]"
  - Integrates league insights, set piece takers, dream team data into recommendations

**Navigation Streamlining:**
- **REMOVED redundant pages**: Captain Selector, Chip Advisor, Performance Analysis
- **CONSOLIDATED into Gameweek Planner**: All captain, chip, transfer, and league features in one place
- **Clean navigation**: Dashboard → Team Modeller → Transfers → Fixtures → Gameweek Planner → Settings
- **Rationale**: Gameweek Planner already showed captain/chip recommendations; separate pages were redundant

**UI Enhancements:**
- League Competitive Analysis section in Gameweek Planner
- Shows: rank, gap to 1st, common picks among leaders, differentials with reasoning
- Visual player avatars for essential picks and differentials
- Strategic insights tailored to user's league position
- **Note**: User must configure `primary_league_id` in Settings to enable league features

**Files Modified**: server/fpl-api.ts, server/routes.ts, server/league-analysis.ts, server/gameweek-analyzer.ts, client/src/components/app-sidebar.tsx, client/src/App.tsx, client/src/pages/gameweek-planner.tsx

### Team Modeller UI Cleanup (October 17, 2025)
**Removed extraneous and misleading data displays from Team Modeller:**
- **AI Prediction Panel Simplification**:
  - Removed misleading "Current: 374 pts" that was showing total season points instead of gameweek predictions
  - Removed confusing "Expected Change: -374 pts" calculation (was subtracting season total from gameweek prediction)
  - Now shows only: Predicted Gameweek Points, Confidence %, and Key Insights
  - Cleaner, focused UI without scary/meaningless negative numbers
- **Player Image Fix**:
  - Added missing `photo` field to `fplPlayerSchema` in shared/schema.ts
  - Fixed player avatar URLs from incorrect `p${player.id}.png` to correct `p${player.photo}` (e.g., "p437730.jpg")
  - Player images now load correctly from FPL CDN with fallback to initials if unavailable
- **Files Updated**: prediction-panel.tsx, team-modeller.tsx, pitch-visualization.tsx, shared/schema.ts

### Gameweek Plan Retrieval Bug Fix (October 17, 2025)
**Fixed critical bug where stale gameweek plans were displayed instead of latest AI recommendations:**
- **Root Cause**: `storage.getGameweekPlan()` had no ORDER BY clause, returning oldest plan when duplicates existed
- **Impact**: UI displayed wrong captain/vice-captain recommendations (players not in user's team)
- **Fix**: Added `desc(gameweekPlans.createdAt)` ordering to ensure latest plan is always returned
- **Database Cleanup**: Removed 6 duplicate plans, keeping only the most recent per user+gameweek
- **Also Fixed**: `getLatestGameweekPlan()` now correctly orders by created_at DESC instead of gameweek
- **Testing**: Verified API returns plan ID 8 (latest) with correct recommendations: Semenyo (captain), Saliba (vice-captain)

### UI Workflow Clarification (October 17, 2025)
**Updated Gameweek Planner to promote manual workflow with AI assistance:**
- **Primary Workflow**: AI recommends → User applies manually in FPL → Sync button updates app
- **Clear Step-by-Step Guide**: Added visual workflow instructions in Gameweek Planner
- **Sync from FPL Button**: Primary action button with loading states and proper mutation handling
- **Auto-Apply Optional**: Moved to secondary position with clear warnings about FPL's anti-bot blocking
- **Realistic Expectations**: UI now clearly communicates that true "zero-touch" automation isn't possible due to FPL's security

### Cookie Authentication as Primary Method (October 17, 2025)
**After extensive testing, cookie authentication is now the primary FPL authentication method:**
- **Browser automation blocked by FPL** - FPL's anti-bot system redirects automated browsers to `holding.html` page, preventing login
- **Cookie method works on all devices** - Including iOS, Android, and all platforms
- **Simplified user experience** - Clear iOS-friendly setup guide with step-by-step instructions
- **Cookie expiry tracking** - Backend tracks expiry dates, UI shows days remaining, warns when <2 days left
- **7-day validity** - Cookies last ~7 days, users get proactive renewal reminders
- **Secure storage** - AES-256-GCM encrypted credential storage with FPL_ENCRYPTION_KEY
- **Auto-refresh attempt**: Optional email/password storage to attempt automatic cookie refresh (may be blocked by FPL)

### Authentication Bug Fixes
1. **URL Encoding Issue**: Fixed bug where cookies were stored URL-encoded (`%3A` instead of `:`). Added `decodeURIComponent()` to `getSessionCookies()` method in `server/fpl-auth.ts`.
2. **Cookie Requirements**: FPL API requires 3 cookies for full authentication:
   - `sessionid` (or `Sessionid`) - Session identifier
   - `csrftoken` (or `Csrf`) - CSRF protection token
   - `pl_profile` - **Main authentication cookie (required for POST requests)**
3. **Debug Endpoint**: Added `/api/fpl-auth/debug-cookies/:userId` endpoint to verify cookie status (shows decoded cookies, CSRF token, and encoding status).

### Data Integrity
- Stale gameweek plan deleted (contained recommendations for non-existent players)
- Team Modeller has auto-load functionality (lines 310-327) that correctly populates team from database

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.
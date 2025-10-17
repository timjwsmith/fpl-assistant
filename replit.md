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
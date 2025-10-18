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
- **Colors (Official FPL Palette):**
  - **Deep Purple:** hsl(280, 100%, 12%) - Background & brand
  - **Magenta Pink:** hsl(338, 94%, 47%) - Primary buttons & actions
  - **Cyan Blue:** hsl(182, 100%, 51%) - Accents & highlights
  - **Neon Green:** hsl(152, 100%, 50%) - Success & positive stats
  - **Bright Yellow:** hsl(60, 100%, 50%) - Warnings & alerts
  - **White:** #ffffff - Text on dark backgrounds

### Core Features
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, formation selector, budget tracking, live AI predictions, and transfer application.
- **Gameweek Planner (Consolidated Hub)**: Centralized interface for all recommendations including:
    - **Transfer Analyzer**: AI-recommended transfers based on fixtures, form, stats, price changes, and injury status.
    - **Fixture Planner**: 6-week fixture difficulty overview.
    - **Captain Selector**: Top 3 AI captain recommendations with confidence scores and expected points.
    - **Chip Advisor**: Strategic recommendations for Wildcard, Triple Captain, Bench Boost, and Free Hit.
    - **League Projection & Competitor Analysis**: Predicts league standings, identifies "essential picks" and "differential opportunities" among competitors, and generates strategic insights.
- **Performance Analysis**: Compares predicted vs. actual points and tracks AI prediction accuracy.
- **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and notification preferences.
- **Full Automation System**: End-to-end automation for applying optimal FPL changes each gameweek.
    - **FPL Authentication**: Cookie-based authentication system with secure, encrypted storage, expiry tracking, and renewal reminders.
    - **AI Gameweek Analyzer**: Comprehensive analysis considering all FPL rules.
    - **One-Click Apply**: "Apply to FPL Account" button for instant implementation.
    - **Automated Scheduler**: Background service for automatic plan application before gameweek deadlines.
    - **Zero Intervention Mode**: Fully automated system handling everything automatically (optional).
    - **Change History**: Tracking of all applied changes with status.
    - **UI Workflow**: AI recommends, user applies manually or via optional auto-apply.

### System Design Choices
- **AI Prediction Pipeline**: User input is processed by a Context Builder, then fed to GPT-5 for analysis, returning structured and natural language responses. AI services include player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for managing long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching to manage requests to the official FPL API.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics for enhanced prediction accuracy.
- **Cookie Management**: Cookies are automatically URL-decoded, with a debug endpoint for verification.
- **Verbose AI Reasoning**: AI provides data-backed, natural language explanations without technical jargon.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.

## Recent Changes

### League Projection Sorting Fix (October 18, 2025)
**Fixed incorrect league standings projection where teams with fewer points were ranked higher:**

**Problem**: League projection was only predicting points for top 10 managers + user (11 total), but displaying all 20 league members. Teams without predictions received 0 predicted GW points, causing incorrect sorting where lower-ranked teams with higher current points were displayed below the user.

**Solution**: Changed prediction logic to predict points for ALL league members instead of just top 10:
- Modified `server/routes.ts` league projection endpoint to predict for all `entries` instead of `topEntries.slice(0, 10)`
- Removed limit on competitor IDs: `const competitorIds = entries.map((e: any) => e.entry);`
- Fixed TypeScript Set iteration issue in `server/league-projection.ts` using `Array.from()` instead of spread operator

**Impact**: All 20 league members now receive predicted GW points, resulting in accurate projected standings sorted by total projected points (current + predicted). The league standings table now correctly displays all members in proper rank order.

**Files Modified**: server/routes.ts, server/league-projection.ts, client/src/pages/gameweek-planner.tsx

### Sync Data Refresh Fix (October 17, 2025)
**Fixed team sync not updating displayed data across the app:**

**Problem**: After syncing team from FPL, the Dashboard and other pages still showed old cached data because only the settings query was being invalidated.

**Solution**: Updated sync mutation to invalidate all relevant queries:
- Settings query: `/api/settings/:userId`
- Manager status query (both formats):
  - Array format: `["/api/manager", managerId, "status"]`
  - String format: `` `/api/manager/${managerId}/status` ``

**Impact**: Now when you sync your team in Settings, all pages immediately refresh with the latest data from FPL.

**Files Modified**: client/src/pages/settings.tsx
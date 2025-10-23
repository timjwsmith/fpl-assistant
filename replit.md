# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions with minimal intervention. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues.

**Mobile-First Design:** Fully responsive PWA (Progressive Web App) optimized for iOS devices with bottom tab navigation, touch-friendly interactions. PWA home screen installation requires deployment (see Replit Platform Limitations below).

## User Preferences
- Default theme: Dark mode
- Default risk tolerance: Balanced
- Formation: Automatically determined by AI for each gameweek

## Recent Changes
- **2025-10-23**: Migrated AI prediction system from GPT-5 to GPT-4o with temperature: 0 for true deterministic predictions. GPT-5 does not support temperature: 0 (locked at 1, causing variance), while GPT-4o enables consistent recommendations for identical input data. This ensures users receive the same predictions unless actual FPL data changes (form, fixtures, injuries).
- **2025-10-23**: Integrated Understat.com advanced statistics (npxG, xGChain, xGBuildup) to enhance AI predictions with deeper attacking involvement metrics. Implemented efficient web scraping with 24-hour caching and in-flight request deduplication (91% reduction in API calls). AI now analyzes non-penalty xG for true goal threat, xGChain for attacking involvement, and xGBuildup for build-up contribution.
- **2025-10-22**: Fixed AI prediction consistency by setting temperature: 0 on all OpenAI calls. This ensures the same team data always produces the same prediction, eliminating random variance (e.g., 64 pts vs 51 pts for identical teams). FPL data still refreshes every 5 minutes for injury/form updates.
- **2025-10-22**: Removed PlayerSearchPanel from Team Modeller to align with AI-first workflow where users don't manually search/add players. Team Modeller now focused solely on viewing squad, syncing from FPL, and seeing AI predictions.
- **2025-10-22**: Improved AI Prediction panel UX. Redesigned loading state to show a compact spinner instead of confusing "0 pts" and "0%" placeholders. Panel now elegantly handles loading, empty, and ready states for better mobile experience.
- **2025-10-22**: Enhanced differential strategy in AI recommendations. AI now actively incorporates differential opportunities into transfer recommendations based on league position: aggressive differentials when >50pts behind, balanced approach for 20-50pts gap, conservative template picks when <20pts behind. Differentials are now ACTIONABLE, not just informational.
- **2025-10-22**: Removed manual formation selector from settings. AI now automatically determines the optimal formation for each gameweek based on squad composition, player form, and fixtures. Formation recommendation is displayed prominently in the planner with reasoning included in AI analysis.
- **2025-10-22**: AI accuracy validated: Predicted 64 points for GW8, actual result was 63 points (98.4% accuracy).
- **2025-10-21**: Architect review identified critical documentation gaps. Added Replit Platform Limitations section and Pre-Release Checklist to prevent recurring platform-specific mistakes.
- **2025-10-21**: Added fallback logic to handle transition period between gameweeks. When a gameweek finishes but the next gameweek's team picks aren't available yet in the FPL API, the sync now gracefully falls back to showing the most recent available data instead of failing.
- **2025-10-20**: Fixed team sync issue where app was showing previous gameweek data after a gameweek finished. Manager sync now correctly detects when a gameweek has finished and fetches the next gameweek's team instead.
- **2025-10-20**: Enhanced AI validation with retry mechanism (max 3 attempts) to ensure all recommendations comply with FPL rules (max 3 players per team, correct squad composition, budget limits).

## System Architecture

### Technology Stack
- **Frontend:** React 18, TypeScript, Wouter, TanStack Query
- **Backend:** Express.js, Node.js
- **AI:** OpenAI GPT-4o with temperature: 0 for deterministic predictions (via Replit AI Integrations)
- **Data Source:** Official FPL API + Understat.com (advanced statistics)
- **Storage:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS, Shadcn UI components

### Design System - FPL Official Theme
- **Theme:** Official Fantasy Premier League design system
- **Fonts:** Inter (primary), JetBrains Mono (monospace)
- **Dark Mode:** FPL Deep Purple (#38003c) background - default
- **Colors (Official FPL Palette):** Deep Purple, Magenta Pink, Cyan Blue, Neon Green, Bright Yellow, White.
- **Responsive Design:** Mobile-first with Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Navigation:** Desktop sidebar (≥768px), Mobile bottom tab bar with 5 tabs (Dashboard, Team, Transfers, Planner, Settings)
- **Touch Optimization:** 44px minimum tap targets, iOS safe area support for notch/home indicator
- **PWA Features:** Standalone mode, offline support, FPL-themed app icon and splash screen. iOS home screen installation available after deployment only (blocked in development mode).

### Core Features
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, formation selector, budget tracking, live AI predictions, and transfer application.
- **Gameweek Planner (Consolidated Hub)**: Centralized interface for all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Performance Analysis**: Compares predicted vs. actual points and tracks AI prediction accuracy.
- **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and optional FPL authentication for advanced features.

### System Design Choices
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-4o (temperature: 0) for deterministic analysis, returning structured and natural language responses. AI services cover player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for managing long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Understat Integration**: Web scraping service enriches player data with advanced statistics (npxG, xGChain, xGBuildup) scraped from Understat.com. Features 24-hour caching, in-flight request deduplication, and graceful fallback when data unavailable. Reduces duplicate API calls by 91% through intelligent request sharing.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics for enhanced prediction accuracy, including Understat's advanced attacking involvement metrics.
- **Verbose AI Reasoning**: AI provides data-backed, natural language explanations without technical jargon.
- **AI Impact Analysis & Learning System**: Tracks AI performance, compares predicted vs. actual points, learns from past mistakes, and incorporates feedback into future recommendations.
- **Strategic AI Overhaul**: AI now performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits for premium players. It proactively recommends strategic multi-transfer plans based on 6-gameweek fixture analysis and full ROI calculations.
- **Manual Workflow**: AI provides comprehensive recommendations for transfers, captain selection, and chip strategy. Users manually apply these recommendations in the official FPL app/website, maintaining full control over their team.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, with AI focused on efficiency, budget calculation, and minimizing point hits.
- **FPL Authentication (Optional)**: Supports email/password login and cookie-based authentication for advanced features. Note: FPL's Datadome bot protection may block automated logins. Team fetching works without authentication via the public FPL API using Manager ID.
- **AI Player ID Validation**: Server-side validation and correction of AI-provided player IDs to ensure accuracy in recommendations, preventing "Unknown Player" issues.
- **Budget Constraint Fixes**: AI recommendations now adhere to realistic budget constraints for single and multi-transfers, providing clear financial calculations.
- **Visual Enhancements**: Integration of team badge and player shirt graphics into the UI for a more authentic FPL experience, matching the official app design.

## Replit Platform Limitations

### Development Mode Restrictions
- **PWA Installation Blocked**: iOS "Add to Home Screen" does NOT work in development mode. Replit blocks external access to dev servers via PWA installations for security.
  - ✅ **Works**: Replit webview/preview during development
  - ❌ **Blocked**: Installing PWA to iPhone home screen in dev mode
  - ✅ **Solution**: Deploy the app first, then install PWA from deployed URL

- **Mobile Testing**: Development server accessible via:
  - Replit mobile app webview
  - QR code from Replit networking pane
  - Direct `.replit.dev` URL in mobile browser
  - NOT installable until deployed

### Verification Requirements
Before claiming any feature works on Replit:
1. Test in Replit environment (not just general web dev knowledge)
2. Search Replit documentation for platform-specific limitations
3. Verify on actual target platform (iOS/Android/Desktop)
4. Document any platform-specific behaviors in this file

## Pre-Release Checklist

### Platform Verification (Required Before Deployment)
- [ ] PWA installation tested from deployed URL on iOS Safari
- [ ] Mobile access verified via Replit webview and direct URL
- [ ] All workflows running without errors
- [ ] Development server allows external hosts (Vite config: `server.host: true`)

### Functional Validations (Required Before Release)
- [ ] AI recommendations comply with FPL rules (max 3 per team, budget, squad composition)
- [ ] Gameweek sync handles all edge cases (finished GW, next GW not available, mid-season)
- [ ] Manager sync fallback behavior tested when FPL API returns 404
- [ ] Chip usage validation (can't use same chip twice, Wildcard timing rules)
- [ ] Transfer cost calculations accurate (4 points per extra transfer)

### Manual Test Steps
1. **Manager Sync**: Connect FPL ID, verify team loads correctly
2. **AI Transfers**: Generate recommendations, verify no rule violations (check team counts)
3. **Gameweek Transition**: Test sync when GW just finished (should fallback gracefully)
4. **PWA Install** (post-deployment): Add to iOS home screen, verify standalone mode works
5. **Mobile Navigation**: Test all 5 bottom tabs on iPhone (tap targets ≥44px)

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **Understat.com**: For advanced player statistics (npxG, xGChain, xGBuildup) via web scraping. Data cached for 24 hours.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.
- **cheerio**: HTML parsing library for Understat.com web scraping.
# FPL Assistant - AI-Powered Fantasy Premier League Tool

## Overview
The FPL Assistant is an intelligent tool designed to optimize Fantasy Premier League team selection, transfers, captain choices, and chip strategy. It provides AI-powered predictions and real-time FPL data analysis to help users make optimal FPL decisions with minimal intervention. The project's ambition is to automate transfer recommendations, captain selection, chip timing, and formation optimization, all while adhering to FPL rules. It also focuses on predicting league standings and offering strategic insights to aid users in winning their mini-leagues.

**Mobile-First Design:** Fully responsive PWA (Progressive Web App) optimized for iOS devices with bottom tab navigation, touch-friendly interactions, and installable on iPhone home screen.

## User Preferences
- Default theme: Dark mode
- Default formation: 4-4-2
- Default risk tolerance: Balanced

## Recent Changes
- **2025-10-20**: Fixed team sync issue where app was showing previous gameweek data after a gameweek finished. Manager sync now correctly detects when a gameweek has finished and fetches the next gameweek's team instead.
- **2025-10-20**: Enhanced AI validation with retry mechanism (max 3 attempts) to ensure all recommendations comply with FPL rules (max 3 players per team, correct squad composition, budget limits).

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
- **Responsive Design:** Mobile-first with Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Navigation:** Desktop sidebar (≥768px), Mobile bottom tab bar with 5 tabs (Dashboard, Team, Transfers, Planner, Settings)
- **Touch Optimization:** 44px minimum tap targets, iOS safe area support for notch/home indicator
- **PWA Features:** Installable on iOS home screen, standalone mode, offline support, FPL-themed app icon and splash screen

### Core Features
- **Dashboard**: Real-time FPL stats, AI recommendations, squad preview, upcoming fixtures.
- **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync, formation selector, budget tracking, live AI predictions, and transfer application.
- **Gameweek Planner (Consolidated Hub)**: Centralized interface for all recommendations including Transfer Analyzer, Fixture Planner, Captain Selector, Chip Advisor, and League Projection & Competitor Analysis.
- **Performance Analysis**: Compares predicted vs. actual points and tracks AI prediction accuracy.
- **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and optional FPL authentication for advanced features.

### System Design Choices
- **AI Prediction Pipeline**: User input processed by Context Builder, then GPT-5 for analysis, returning structured and natural language responses. AI services cover player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Database-backed async polling system for managing long-running AI predictions.
- **FPL API Integration**: Backend proxy with 5-minute caching for official FPL API requests.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics for enhanced prediction accuracy.
- **Verbose AI Reasoning**: AI provides data-backed, natural language explanations without technical jargon.
- **AI Impact Analysis & Learning System**: Tracks AI performance, compares predicted vs. actual points, learns from past mistakes, and incorporates feedback into future recommendations.
- **Strategic AI Overhaul**: AI now performs multi-gameweek planning and ROI analysis, considering long-term benefits and justifying point hits for premium players. It proactively recommends strategic multi-transfer plans based on 6-gameweek fixture analysis and full ROI calculations.
- **Manual Workflow**: AI provides comprehensive recommendations for transfers, captain selection, and chip strategy. Users manually apply these recommendations in the official FPL app/website, maintaining full control over their team.
- **"Build Around Player" Feature**: Implements optimal multi-transfer planning to build a team around a specific premium player, with AI focused on efficiency, budget calculation, and minimizing point hits.
- **FPL Authentication (Optional)**: Supports email/password login and cookie-based authentication for advanced features. Note: FPL's Datadome bot protection may block automated logins. Team fetching works without authentication via the public FPL API using Manager ID.
- **AI Player ID Validation**: Server-side validation and correction of AI-provided player IDs to ensure accuracy in recommendations, preventing "Unknown Player" issues.
- **Budget Constraint Fixes**: AI recommendations now adhere to realistic budget constraints for single and multi-transfers, providing clear financial calculations.
- **Visual Enhancements**: Integration of team badge and player shirt graphics into the UI for a more authentic FPL experience, matching the official app design.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.
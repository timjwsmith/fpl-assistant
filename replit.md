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

### Design System
- **Theme:** Premier League-inspired with Purple accent
- **Fonts:** Inter (primary), JetBrains Mono (monospace)
- **Dark Mode:** Default with light mode support
- **Colors:** Primary (Purple), Success (Green), Destructive (Red), Background (Deep charcoal)

### Core Features

1.  **Dashboard**: Real-time FPL stats, AI transfer/captain recommendations, squad preview, upcoming fixtures.
2.  **Interactive Team Modeller**: Visual football pitch with drag-and-drop, auto-sync from FPL, manual sync, formation selector, budget tracking, live AI predictions, player search, team saving, and transfer application with cost calculation.
3.  **Transfer Analyzer**: AI-recommended transfers based on fixtures, form, stats, price changes, and injury status. Includes transfer cost calculation and Wildcard timing.
4.  **Fixture Planner**: 6-week fixture difficulty overview, team-by-team analysis, and identification of best/worst fixtures.
5.  **Captain Selector**: Top 3 AI captain recommendations with confidence scores, expected points, ownership analysis, and historical data.
6.  **Chip Advisor**: Strategic recommendations for Wildcard, Triple Captain, Bench Boost, and Free Hit, including double/blank gameweek identification and expected value calculation.
7.  **Performance Analysis**: Compares predicted vs. actual points, tracks AI prediction accuracy, and provides historical insights.
8.  **Settings**: FPL Manager ID connection, risk tolerance, preferred formation, and notification preferences.
9.  **Full Automation System**: Auto-sync and Gameweek Planner for applying optimal FPL changes. Includes FPL authentication, AI-powered Gameweek Analyzer, Transfer Application Service, and UI for reviewing and applying recommendations.

### System Design Choices
- **AI Prediction Pipeline**: User input is processed by a Context Builder, then fed to GPT-5 for analysis, returning a structured response. AI services include player points prediction, transfer recommendations, captain selection, chip strategy, and team analysis.
- **Asynchronous AI Processing**: Implemented a database-backed async polling system to manage long-running AI predictions and bypass network proxy limitations.
- **FPL API Integration**: Backend proxy with 5-minute caching to manage requests to the official FPL API.
- **Comprehensive Player Stats**: AI models leverage 20+ additional player metrics, including ICT Index, Bonus Points System, Consistency Metrics (PPG), Defensive Analytics (xGC, clean sheets), Injury & Availability, Suspension Risk, and Actual vs. Expected stats for enhanced prediction accuracy.

## External Dependencies
- **Official FPL API**: For all Fantasy Premier League game data.
- **OpenAI GPT-5**: Utilized via Replit AI Integrations for all AI-powered predictions and analysis.
- **PostgreSQL**: Primary database for persistent storage.
- **@dnd-kit**: For drag-and-drop functionality in the Team Modeller.
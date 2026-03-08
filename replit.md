# FPL Assistant - Project Documentation

## Overview
AI-powered Fantasy Premier League assistant with transfer recommendations, lineup optimization, captain suggestions, and team synchronization using OpenAI.

**Status**: Active Development  
**Frontend**: React + TypeScript + Vite  
**Backend**: Express.js + TypeScript  
**Database**: PostgreSQL (Drizzle ORM)  
**AI**: OpenAI GPT-4

---

## Key Features

### AI-Powered Analysis
- **Gameweek Planning**: AI analyzes your squad and suggests optimal transfers, captain, and lineup
- **Transfer Recommendations**: Budget-aware suggestions prioritizing injured bench players
- **Captain Selection**: Data-driven captain and vice-captain picks
- **Lineup Optimization**: Automatic starting XI optimization with swap suggestions

### Team Management
- **FPL Sync**: Import your actual team from Fantasy Premier League
- **Team Modeller**: Drag-and-drop player management with formation changes
- **What-If Analysis**: See predicted points before making changes

### League Features
- **League Projection**: See projected standings based on AI predictions
- **Competitor Analysis**: Track rivals and identify differentials
- **Historical Accuracy**: Track prediction accuracy over time

---

## Project Architecture

### Frontend (`client/`)
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** + shadcn/ui components
- **React Query** for data fetching
- **Wouter** for routing

### Backend (`server/`)
- **Express.js** with TypeScript
- **Drizzle ORM** for database
- **OpenAI API** for AI predictions
- **FPL API** integration for live data

### Shared (`shared/`)
- TypeScript types shared between frontend and backend

---

## API Endpoints

### Core
- `GET /api/settings/:userId` - User settings
- `POST /api/manager/sync/:managerId` - Sync team from FPL
- `GET /api/manager/:managerId/status` - Team status

### AI Planning
- `POST /api/automation/analyze/:userId` - Generate AI plan
- `GET /api/automation/plan/:userId` - Get current plan
- `GET /api/predictions/:userId/:gameweek` - Player predictions

### League
- `GET /api/league-projection/:userId` - Projected standings
- `GET /api/league-analysis/:userId` - Competitor analysis

### GitHub
- `GET /api/github/user` - Connected GitHub user
- `POST /api/github/push` - Push code to GitHub

---

## Development

### Quick Start
The app runs automatically on port 5000 via the configured workflow.

### Database
PostgreSQL with Drizzle ORM. Schema in `shared/schema.ts`.

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key (via Replit integration)

---

## User Preferences

### Coding Style
- TypeScript with strict typing
- Functional components with hooks
- TailwindCSS for styling
- No inline comments unless complex logic

### Design Patterns
- React Query for server state
- Optimistic updates where appropriate
- Mobile-responsive design
- Dark mode support

---

**Last Updated**: January 2026  
**Repository**: https://github.com/timjwsmith/fpl-assistant

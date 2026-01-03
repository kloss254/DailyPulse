# Discipline Tracker

A clean, intuitive web application that combines day planning with activity monitoring to build discipline through visualization and accountability.

## Features

- **Daily Planning Module** - Time-blocking interface with task management, categories, and priorities
- **Real-Time Activity Monitoring** - Start/stop timer, distraction logging, energy tracking
- **Discipline Analytics** - Daily score, focus distribution charts, weekly trends, consistency heatmaps
- **Reflection Tools** - Daily reflection prompts, streak tracking
- **Focus Mode** - Distraction-free interface for deep work sessions
- **Dark/Light Theme** - Toggle between themes

## Tech Stack

- **Frontend**: React + Vite, Recharts, Lucide Icons, date-fns
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both server and client
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx        # Main app component
│   │   └── index.css      # Styles
│   └── package.json
├── server/
│   └── index.js           # Express API server
└── package.json           # Root package.json
```

## API Endpoints

- `GET/POST /api/tasks` - Task management
- `POST /api/timelogs/start|stop` - Timer control
- `POST /api/distractions` - Log distractions
- `POST /api/energy` - Log energy levels
- `GET/POST /api/reflections` - Daily reflections
- `GET /api/analytics/daily|weekly|heatmap` - Analytics data
- `GET /api/streak` - Streak information

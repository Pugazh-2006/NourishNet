# NourishNet

NourishNet is a frontend prototype for reducing food waste by connecting donors, NGOs, and volunteers through a shared donation workflow.

The project started from a Figma export and has now been adapted into a working React application with a lightweight local API, authenticated roles, and a real local SQLite database.

## Current Scope

This repository now includes:

- A Vite + React frontend
- A lightweight local Node API in `server/index.mjs`
- A real local SQLite database in `server/nourishnet.db`
- Role-aware login + signup for donor, NGO, and volunteer accounts

Current limitations:

- No production-hosted database yet
- Password reset via email/token is deferred (in-session password change is available)
- No real map provider or navigation integration yet
- The SQLite backend uses Node's built-in SQLite support for local development

## Features

- Role-based sign-in and self-signup for donor, NGO, and volunteer flows
- Donor dashboard with posted donation tracking
- Food posting form with category and timing details
- NGO donation acceptance flow with volunteer assignment
- Volunteer pickup page that supports multiple assignments
- Donation tracking timeline based on stored workflow history
- Analytics, history, profile, and map screens
- Shared data persisted in the local SQLite database

## Tech Stack

- React
- Vite
- React Router
- Tailwind CSS
- Radix UI components
- Lucide icons
- Recharts
- Express for the local API
- SQLite via Node's built-in `node:sqlite`

## Project Structure

```text
src/
  app/
    components/   reusable UI and feature components
    lib/          frontend API helpers
    pages/        route screens
    state/        app-wide authenticated state
    App.js        app root
    routes.js     client-side routing
  styles/         global styles
  main.jsx         app entry point
server/
  index.mjs       lightweight API server + SQLite schema initialization
  nourishnet.db   local SQLite database file created on first run
```

## Available Routes

- `/login`
- `/`
- `/role-selection`
- `/donor-dashboard`
- `/post-food`
- `/ngo-food-list`
- `/map`
- `/volunteer-pickup`
- `/tracking/:id`
- `/analytics`
- `/active-donations`
- `/history`
- `/profile`

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the example environment file if you want to customize ports, proxy targets, or future map settings:

```bash
cp .env.example .env
```

Start the frontend development server:

```bash
npm run dev
```

Start the local API server in a second terminal:

```bash
npm run server
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run automated tests:

```bash
npm run test
```

Run the current test command:

```bash
npm run test
```

## Environment Variables

The repo now includes `.env.example` with the supported local configuration values:

- `VITE_API_BASE_URL`
- `VITE_API_PROXY_TARGET`
- `VITE_DEV_HOST`
- `VITE_DEV_PORT`
- `VITE_PREVIEW_HOST`
- `VITE_PREVIEW_PORT`
- `PORT`
- `NOMINATIM_URL`
- `GEOCODER_APP_NAME`
- `GEOCODER_REFERER`
- `GEOCODER_TIMEOUT_MS`
- `ROUTING_API_URL`
- `ROUTING_TIMEOUT_MS`
- `FALLBACK_SPEED_KMH`
- `PASSWORD_SCRYPT_N`
- `PASSWORD_SCRYPT_R`
- `PASSWORD_SCRYPT_P`
- `PASSWORD_SCRYPT_KEYLEN`
- `SESSION_TTL_HOURS`
- `SESSION_MAX_LIFETIME_HOURS`
- `SESSION_IDLE_EXTENSION_MINUTES`
- `LOGIN_MAX_ATTEMPTS`
- `LOGIN_WINDOW_MINUTES`
- `LOGIN_LOCK_MINUTES`
- `DB_PATH` (optional override for SQLite path, useful for isolated test runs)

Future map-provider keys can also be added there when you move beyond the current OpenStreetMap setup.

## Demo Accounts

Use these seeded accounts to test the shared workflow:

- `donor@nourishnet.local` / `password123`
- `ngo@nourishnet.local` / `password123`
- `volunteer@nourishnet.local` / `password123`

## Current Behavior

- Users can sign in as donor, NGO, or volunteer, or create new accounts directly from `/login`
- Donations and workflow updates are shared through the local API
- Profile changes and password updates are persisted in the shared database
- Different browser tabs or devices on the same local server can see the same data
- The SQLite database is created and seeded automatically when the server starts for the first time

## Next Recommended Steps

- Follow the prioritized implementation roadmap in [ACTION_PLAN.md](/c:/My Projects/NourishNet/ACTION_PLAN.md)
- Replace the local SQLite deployment with a hosted production database when you move beyond local development
- Add secure auth, hosted persistence, and real map integration

## Origin

The initial UI came from a Figma-generated code bundle and was adapted into this project structure.



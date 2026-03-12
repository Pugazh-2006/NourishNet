# NourishNet

NourishNet is a frontend prototype for reducing food waste by connecting donors, NGOs, and volunteers through a shared donation workflow.

The project started from a Figma export and was converted into a working React application with connected screens, local state, and persistent browser storage.

## Current Scope

This repository is currently a frontend-only application.

- No backend server
- No database
- No authentication
- No real-time multi-user sync
- Data is stored in browser `localStorage`

## Features

- Role selection for donor, NGO, and volunteer flows
- Donor dashboard with posted donation tracking
- Food posting form with category and timing details
- NGO donation acceptance flow
- Volunteer pickup and delivery status flow
- Donation tracking timeline
- Analytics, history, profile, and map screens
- Shared app state persisted in the browser

## Tech Stack

- React
- Vite
- React Router
- Tailwind CSS
- Radix UI components
- Lucide icons
- Recharts

## Project Structure

```text
src/
  app/
    components/   reusable UI and feature components
    data/         initial seed data and types
    pages/        route screens
    state/        app-wide local state
    App.tsx       app root
    routes.ts     client-side routing
  styles/         global styles
  main.tsx        app entry point
```

## Available Routes

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

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Current Behavior

- Donations, profile changes, and workflow status updates are stored locally in the browser
- Refreshing the page keeps data as long as browser storage is not cleared
- Different users or devices do not share data yet

## Next Recommended Steps

- Add a backend API
- Add database models for users, donations, NGOs, and delivery status
- Add authentication and role-based access control
- Replace mock map behavior with a real maps service
- Add file upload and notification support
- Add TypeScript project configuration with `tsconfig.json`

## Origin

The initial UI came from a Figma-generated code bundle and was adapted into this project structure.

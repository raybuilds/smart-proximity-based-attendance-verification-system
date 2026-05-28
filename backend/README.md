# Backend Foundation

## Overview

This backend provides the Phase 1 foundation for the Smart Proximity-Based Attendance Verification System.

Current capabilities:

- Express API with modular routes
- PostgreSQL via Docker Compose
- Prisma ORM with migrations and seed data
- Health and connectivity endpoints
- Centralized error handling
- Request logging and security middleware

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop with Docker Compose

## Environment Setup

1. Copy `.env.example` to `.env`
2. Confirm `DATABASE_URL` points to the local Docker PostgreSQL instance
3. Set a development `JWT_SECRET`

Example database URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attendance_system?schema=public"
```

## Install Dependencies

```bash
npm install
```

## Start PostgreSQL

```bash
npm run docker:up
```

To stop containers without deleting the database volume:

```bash
npm run docker:down
```

## Prisma Workflow

Generate Prisma client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Seed development data:

```bash
npm run db:seed
```

Reset local database:

```bash
npm run db:reset
```

Open Prisma Studio:

```bash
npm run db:studio
```

### Prisma Studio Checks

Use Prisma Studio to:

- inspect the `User` table
- confirm seeded admin, teacher, and student accounts exist
- verify `Student.userId` and `Teacher.userId` relationships
- validate unique fields such as `email`, `rollNumber`, and `employeeId`

## Backend Startup

Development:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

Expected startup flow:

1. Load environment variables
2. Retry database connection until available or retry limit is reached
3. Initialize Prisma
4. Start Express server
5. Print server and database status logs

## Database Verification

Recommended validation flow:

1. Start PostgreSQL with `npm run docker:up`
2. Run `npm run db:migrate`
3. Run `npm run db:seed`
4. Open `npm run db:studio`
5. Confirm seeded users from `TEST_USERS.md`
6. Start backend with `npm run dev`
7. Test `GET /api/health` and `GET /api/test`

## Docker Persistence Test

To verify persistence:

1. Run `npm run db:seed`
2. Open Prisma Studio and confirm users exist
3. Run `docker compose down`
4. Run `docker compose up -d`
5. Re-open Prisma Studio
6. Confirm seeded users still exist

The `postgres_data` volume keeps the database state across container restarts.

## Mobile LAN Testing

For physical device testing with Expo Go:

1. Put phone and laptop on the same Wi-Fi network
2. Use the laptop LAN IP in `mobile/src/services/api.js`
3. Start backend on port `5000`
4. Start Expo with `npm start` inside `mobile`
5. Tap the backend test button in the app

Important notes:

- `localhost` does not work on a physical phone
- Windows Firewall may block port `5000`
- Expo Go networking works best over `LAN` when devices share the same router

## Troubleshooting

- If startup exits immediately, verify PostgreSQL is running and `DATABASE_URL` is correct
- If migrations fail, ensure Docker is healthy and port `5432` is free
- If Prisma Studio opens but shows no rows, run `npm run db:seed`
- If the phone cannot connect, re-check the LAN IP and firewall settings
- If you need a clean local database, run `npm run db:reset`

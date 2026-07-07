# Community Intelligence

A multi-platform community intelligence platform for **Reddit, Facebook, Instagram, Twitter/X, TikTok, and YouTube** — with AI-powered archetype classification, dashboard analytics, and deep topic analysis.

Users can connect community data sources, run AI-powered topic analyses, classify community members into archetypes, and view dashboards with engagement metrics and sentiment trends.

## Tech stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5 (mounted under `/api`)
- **Frontend:** React + Vite
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** OpenAI (or any OpenAI-compatible endpoint)
- **Validation:** Zod, `drizzle-zod`
- **API codegen:** Orval (from an OpenAPI spec)

## Prerequisites

- **Node.js 24+**
- **pnpm 9+** (`npm install -g pnpm`)
- **PostgreSQL 14+** (a database you can connect to)
- An **OpenAI API key** (or any OpenAI-compatible API base URL + key)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable          | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`    | PostgreSQL connection string                                       |
| `SESSION_SECRET`  | Long random string used to sign session cookies                    |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL (`https://api.openai.com/v1`)       |
| `OPENAI_API_KEY`  | Your API key                                                       |
| `APP_USERNAME`    | Username for the first admin account (seeded once, on first run)   |
| `APP_PASSWORD`    | Password for the first admin account (seeded once, on first run)   |

### 3. Create the database schema

Push the Drizzle schema to your database:

```bash
pnpm run db:push
```

### 4. Run in development

```bash
pnpm run dev
```

This starts both services concurrently:

- **API server** → http://localhost:5000 (routes under `/api`)
- **Web app** → http://localhost:5173

The web app proxies `/api` requests to the API server automatically, so open
**http://localhost:5173** in your browser. Log in with the `APP_USERNAME` /
`APP_PASSWORD` you configured.

## Project structure

```
├── artifacts/
│   ├── api-server/   # Express API (routes under /api)
│   └── web-app/      # React + Vite frontend
├── lib/
│   ├── api-spec/     # OpenAPI spec (source of truth for the API contract)
│   ├── api-client-react/  # Generated React Query hooks
│   ├── api-zod/      # Generated Zod schemas
│   ├── db/           # Drizzle schema + client (source of truth for the DB)
│   └── integrations-openai-ai-server/  # OpenAI client wrapper
└── scripts/          # One-off maintenance scripts
```

## Useful commands

| Command                | What it does                                             |
| ---------------------- | ------------------------------------------------------- |
| `pnpm run dev`         | Run API + web app together (development)                |
| `pnpm run build`       | Typecheck and build all packages                        |
| `pnpm run typecheck`   | Typecheck across all packages                           |
| `pnpm run db:push`     | Push the Drizzle schema to the database                 |
| `pnpm run codegen`     | Regenerate API hooks & Zod schemas from the OpenAPI spec |

## Building for production

```bash
pnpm run build
```

- The **API server** builds to `artifacts/api-server/dist/index.mjs`. Run it with
  `node --enable-source-maps artifacts/api-server/dist/index.mjs` with the
  environment variables set (including `PORT`).
- The **web app** builds static assets to `artifacts/web-app/dist/public`. Serve
  those with any static host, and make sure `/api` is routed to the API server
  (via a reverse proxy such as nginx/Caddy, or by serving the static files from
  the same origin as the API).

## Architecture notes

- **Contract-first API:** the OpenAPI spec drives Orval codegen, producing typed
  hooks and Zod validators used on both the client and server.
- **Auth:** Express sessions with bcrypt password hashing and a login-attempt
  audit log.
- **AI classification:** archetype classification runs via the OpenAI API with
  batch processing and SSE progress streaming.
- The `APP_USERNAME` / `APP_PASSWORD` values seed the first admin account only
  once — they are ignored once any user exists.

## License

MIT

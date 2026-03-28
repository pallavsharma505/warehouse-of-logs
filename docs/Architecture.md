# Architecture


The WarehouseOfLogs ecosystem consists of three decoupled components operating over a shared, embedded database. Because SQLite is file-based, the components communicate via the file system (database) and HTTP.

## System Components

1. **Collector Service (Port: 3001)**
   - **Role**: Dedicated to receiving HTTP POST requests containing log data.
   - **Mechanism**: Validates payloads, extracts metadata, and performs high-speed inserts into SQLite.
   - **Concurrency**: Acts as the primary "Writer" to the database.

2. **API Service (Port: 3002)**
   - **Role**: Serves HTTP GET requests for log retrieval, filtering, and aggregation/stats.
   - **Mechanism**: Translates HTTP query parameters into optimized SQL queries.
   - **Concurrency**: Acts as a "Reader" from the database.

3. **Frontend Application (Port: 5173)**
   - **Role**: Client-side single-page application (SPA).
   - **Mechanism**: Polls or queries the API Service to display log tables, charts, and filtering UI.

## Database Concurrency Strategy
Because SQLite locks the database file during writes, having a separate Collector (Writer) and API (Reader) could cause lock contention.
**Solution**: We will configure SQLite with `PRAGMA journal_mode = WAL;` (Write-Ahead Logging). This allows multiple concurrent readers (API) to read the database while a writer (Collector) is actively inserting logs, completely eliminating read/write blocking.

## Monorepo Layout (using Bun workspaces)
```text
WarehouseOfLogs/
├── package.json (workspace root)
├── bun.lockb
├── database/
│   └── logs.sqlite (Shared DB file)
├── apps/
│   ├── collector/   (Bun + Hono)
│   ├── api/         (Bun + Hono)
│   └── frontend/    (Vite + React + TS)
└── docs/            (Markdown documentation)
```

---

### 3. `TechStack.md`

# Tech Stack

The stack is optimized for speed, developer experience, and minimal overhead.

## Core & Backend
- **Runtime**: [Bun v1.3.10](https://bun.sh/) - Serves as the JavaScript runtime, package manager, and test runner.
- **Language**: TypeScript - For strict type safety across the monorepo.
- **Web Framework**: [HonoJS](https://hono.dev/) - An ultrafast, lightweight web framework that runs natively on Bun. Used for both the Collector and API.
- **Database**: SQLite via `bun:sqlite` - Bun's native SQLite driver is exceptionally fast and synchronous, perfect for our ingestion needs.
- **Validation**: [Zod](https://zod.dev/) - Schema validation for incoming log payloads and API query parameters.

## Frontend
- **Framework**: ReactJS
- **Build Tool**: ViteJS - For rapid HMR and optimized production builds.
- **Routing**: React Router DOM (v6) - For navigating between Dashboard, Log Stream, and Settings.
- **Styling**: TailwindCSS - Utility-first CSS for rapid UI development without writing custom CSS files.
- **Data Fetching**: TanStack Query (React Query) - Ideal for handling API polling, caching, and state management for log streams.

## Tooling
- **Monorepo Management**: Bun Workspaces
- **Linting/Formatting**: BiomeJS (or ESLint/Prettier)
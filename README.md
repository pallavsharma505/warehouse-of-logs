# WarehouseOfLogs 📦

[![npm](https://img.shields.io/npm/v/warehouse-of-logs-client)](https://www.npmjs.com/package/warehouse-of-logs-client)
[![Docker](https://img.shields.io/docker/v/pallavsharma505/warehouse-of-logs?label=docker)](https://hub.docker.com/r/pallavsharma505/warehouse-of-logs)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

WarehouseOfLogs is a high-performance, lightweight log aggregation service built with Bun, TypeScript, and SQLite. It allows applications to ship logs with custom metadata, stores them efficiently, and provides a modern React interface for monitoring, querying, and analyzing the log streams.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Docker](#docker)
- [npm Client Library](#npm-client-library)
- [Services](#services)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [License](#license)

---

## Project Structure

```
warehouse-of-logs/
├── apps/
│   ├── collector/        # Log ingestion service (port 7001)
│   ├── api/              # Query & management API (port 7002)
│   └── frontend/         # React dashboard (port 7003)
├── packages/
│   └── db/               # Shared SQLite database module
├── npm-package/          # warehouse-of-logs-client (npm library)
├── docker-compose.yml
├── Dockerfile
└── nginx.conf
```

- **`apps/collector`** — High-throughput ingestion service that receives and writes logs.
- **`apps/api`** — Backend service that queries the database and serves data to the frontend.
- **`apps/frontend`** — React UI for monitoring, searching, and managing logs.
- **`packages/db`** — Shared SQLite connection, schema, and migrations.
- **`npm-package`** — Lightweight TypeScript client for shipping logs from any Node.js/Bun/Deno app.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+

### Install Dependencies

```bash
bun install
```

### Run All Services (Development)

```bash
bun run dev
```

This starts all three services concurrently:

| Service   | URL                    |
|-----------|------------------------|
| Collector | http://localhost:7001  |
| API       | http://localhost:7002  |
| Frontend  | http://localhost:7003  |

### Run Services Individually

```bash
bun run dev:collector   # Collector on :7001
bun run dev:api         # API on :7002
bun run dev:frontend    # Frontend on :7003
```

### Create an API Key

Before ingesting logs, generate an API key via the API service:

```bash
curl -s http://localhost:7002/keys -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app"}' | jq
```

Save the returned `key` — it is shown only once.

### Send Your First Log

```bash
curl http://localhost:7001/ingest -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "app_name": "my-app",
    "level": "INFO",
    "message": "Hello from WarehouseOfLogs!"
  }'
```

### Query Logs

```bash
curl http://localhost:7002/logs | jq
```

---

## Docker

The entire stack runs in a **single container** — collector, API, and frontend (served via nginx) — making deployment simple.

### Using Docker Compose (Recommended)

```bash
docker compose up -d
```

This exposes ports `7001`, `7002`, and `7003`, and persists the SQLite database in a Docker volume.

### Using the Pre-built Image from Docker Hub

```bash
docker pull pallavsharma505/warehouse-of-logs:latest

docker run -d \
  --name warehouse-of-logs \
  -p 7001:7001 \
  -p 7002:7002 \
  -p 7003:7003 \
  -v wol-data:/data \
  pallavsharma505/warehouse-of-logs:latest
```

### Build Locally

```bash
docker build -t warehouse-of-logs .
docker run -d -p 7001:7001 -p 7002:7002 -p 7003:7003 -v wol-data:/data warehouse-of-logs
```

---

## npm Client Library

Install the official client to ship logs from any TypeScript/JavaScript application:

```bash
npm install warehouse-of-logs-client
```

### Quick Example

```typescript
import { WolClient } from "warehouse-of-logs-client";

const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "your-api-key",
  appName: "my-service",
});

// Level shortcuts — batched automatically
logger.info("User signed in", { userId: "abc123" });
logger.error("Payment failed", { orderId: "ord-456" });

// Flush remaining logs on shutdown
await logger.shutdown();
```

### Client Options

| Option          | Type    | Default | Description                          |
|-----------------|---------|---------|--------------------------------------|
| `collectorUrl`  | string  | —       | Base URL of the collector service    |
| `apiKey`        | string  | —       | Bearer token for authentication      |
| `appName`       | string  | —       | Default app name attached to logs    |
| `persist`       | boolean | `false` | Whether logs are stored permanently  |
| `expiresIn`     | number  | —       | Default TTL in seconds for temp logs |
| `batchSize`     | number  | `50`    | Buffer size before auto-flush        |
| `flushInterval` | number  | `5000`  | Max ms between flushes               |

For full usage details, see the [npm package README](./npm-package/README.md) or [npmjs.com/package/warehouse-of-logs-client](https://www.npmjs.com/package/warehouse-of-logs-client).

---

## Services

### Collector (port 7001)

Receives logs via HTTP and writes them to SQLite. Validates payloads with Zod. Supports single and batch ingestion, temporary logs with TTL, and automatic cleanup of expired entries every 5 minutes.

### API (port 7002)

Read-only query interface plus API key management. Provides filtering by level, app name, time range, and full-text search. Returns paginated results and aggregated statistics.

### Frontend (port 7003)

React 19 dashboard built with Vite, TailwindCSS, and TanStack Query. Features a live log stream view, dashboard with charts, API key management UI, and an interactive API docs page.

---

## Environment Variables

| Variable         | Default                 | Description                        |
|------------------|-------------------------|------------------------------------|
| `API_KEY`        | `dev-api-key`           | Initial API key for authentication |
| `COLLECTOR_PORT` | `7001`                  | Port for the collector service     |
| `API_PORT`       | `7002`                  | Port for the API service           |
| `DATABASE_PATH`  | `./database/logs.sqlite`| Path to the SQLite database file   |

---

## API Overview

### Collector

| Method | Endpoint  | Description                  |
|--------|-----------|------------------------------|
| POST   | `/ingest` | Ingest single or batch logs  |
| GET    | `/health` | Health check                 |

### API

| Method | Endpoint     | Description                       |
|--------|--------------|-----------------------------------|
| GET    | `/logs`      | Query logs (filter, search, page) |
| GET    | `/logs/:id`  | Get a single log entry            |
| GET    | `/stats`     | Aggregated statistics & charts    |
| GET    | `/apps`      | List distinct app names           |
| GET    | `/keys`      | List API keys                     |
| POST   | `/keys`      | Create a new API key              |
| PATCH  | `/keys/:id`  | Revoke an API key                 |
| DELETE | `/keys/:id`  | Delete an API key                 |
| GET    | `/health`    | Health check                      |

For detailed request/response schemas, see [API Contracts](./docs/API-Contracts.md).

---

## Documentation

- [Features](./docs/Features.md) — Core capabilities of the system.
- [Architecture](./docs/Architecture.md) — System design and data flow.
- [Database Schema](./docs/Database-Schema.md) — SQLite table structures and indexing strategy.
- [API Contracts](./docs/API-Contracts.md) — Endpoints for ingestion and querying.

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 Pallav Sharma.
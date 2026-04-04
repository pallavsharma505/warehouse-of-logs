# WarehouseOfLogs 📦

A high-performance, lightweight log aggregation service built with Bun, TypeScript, and SQLite. Ships with a collector for log ingestion, a query API, and a React dashboard — all in a single container.

## Quick Start

```bash
docker run -d \
  --name warehouse-of-logs \
  -p 7001:7001 \
  -p 7002:7002 \
  -p 7003:7003 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=changeme \
  -v wol-data:/data \
  pallavsharma505/warehouse-of-logs:latest
```

| Port | Service                   |
|------|---------------------------|
| 7001 | Collector (log ingestion) |
| 7002 | API (query & management)  |
| 7003 | Frontend (React dashboard)|

Open **http://localhost:7003** to view the dashboard.

## Docker Compose

```yaml
services:
  warehouse-of-logs:
    image: pallavsharma505/warehouse-of-logs:latest
    container_name: warehouse-of-logs
    restart: unless-stopped
    ports:
      - "7001:7001"
      - "7002:7002"
      - "7003:7003"
    environment:
      COLLECTOR_PORT: "7001"
      API_PORT: "7002"
      DATABASE_PATH: "/data/logs.sqlite"
      ADMIN_USER: "admin"
      ADMIN_PASSWORD: "changeme"
    volumes:
      - wol-data:/data

volumes:
  wol-data:
    driver: local
```

```bash
docker compose up -d
```

## Environment Variables

| Variable         | Default              | Description                                |
|------------------|----------------------|--------------------------------------------|
| `ADMIN_USER`     | `admin`              | Username for dashboard and API login       |
| `ADMIN_PASSWORD` | `admin`              | Password for dashboard and API login       |
| `COLLECTOR_PORT` | `7001`               | Port for the collector service             |
| `API_PORT`       | `7002`               | Port for the API service                   |
| `DATABASE_PATH`  | `/data/logs.sqlite`  | Path to the SQLite database                |
| `JWT_SECRET`     | *(auto-generated)*   | Secret for signing JWT tokens              |

> **Important:** Change `ADMIN_USER` and `ADMIN_PASSWORD` from the defaults before deploying to production.

## Usage

### 1. Log In

The dashboard and all API endpoints (except `/health`) require authentication. Open **http://localhost:7003** and sign in with your `ADMIN_USER` and `ADMIN_PASSWORD`.

To authenticate via the API, obtain a JWT token:

```bash
TOKEN=$(curl -s http://localhost:7002/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}' | jq -r '.token')
```

Include the token in subsequent API requests:

```bash
curl -s http://localhost:7002/logs \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 2. Create an API Key

```bash
curl -s http://localhost:7002/keys -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "my-app"}' | jq
```

Save the returned `key` — it is shown only once.

### 3. Send Logs

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

### 4. Query Logs

```bash
curl -s http://localhost:7002/logs \
  -H "Authorization: Bearer $TOKEN" | jq
```

Or open **http://localhost:7003** and sign in to use the web dashboard.

## Log Ingestion Schema

```json
{
  "app_name": "string (required)",
  "level": "INFO | WARN | ERROR | DEBUG (required)",
  "message": "string (required)",
  "timestamp": "ISO 8601 string (optional)",
  "metadata": "object (optional)",
  "persist": "boolean (optional, default: false)",
  "expires_in": "number in seconds (optional, default: 86400)"
}
```

Batch ingestion is also supported — send an array of log objects to the same endpoint.

## Persistent Storage

The SQLite database is stored at the `DATABASE_PATH` location inside the container (default: `/data/logs.sqlite`). Mount a volume to `/data` to persist logs across container restarts.

## npm Client Library

For programmatic log shipping from Node.js, Bun, or Deno applications:

```bash
npm install warehouse-of-logs-client
```

```typescript
import { WolClient } from "warehouse-of-logs-client";

const logger = new WolClient({
  collectorUrl: "http://localhost:7001",
  apiKey: "your-api-key",
  appName: "my-service",
});

logger.info("User signed in", { userId: "abc123" });
await logger.shutdown();
```

Full documentation: [warehouse-of-logs-client on npm](https://www.npmjs.com/package/warehouse-of-logs-client)

## API Endpoints

### Collector (port 7001)

| Method | Endpoint  | Description                 |
|--------|-----------|-----------------------------|
| POST   | `/ingest` | Ingest single or batch logs |
| GET    | `/health` | Health check                |

### API (port 7002)

| Method | Endpoint       | Auth     | Description                            |
|--------|----------------|----------|----------------------------------------|
| POST   | `/login`       | None     | Get JWT token with admin creds         |
| GET    | `/health`      | None     | Health check                           |
| GET    | `/logs`        | JWT      | Query logs (filter, search, page)      |
| DELETE | `/logs`        | JWT      | Bulk delete logs matching filters      |
| GET    | `/logs/export` | JWT      | Export logs as JSONL file              |
| GET    | `/logs/:id`    | JWT      | Get a single log entry                 |
| GET    | `/stats`       | JWT      | Aggregated statistics & charts         |
| GET    | `/apps`        | JWT      | List distinct app names                |
| GET    | `/keys`        | JWT      | List API keys                          |
| POST   | `/keys`        | JWT      | Create a new API key                   |
| PATCH  | `/keys/:id/revoke` | JWT  | Revoke an API key                      |
| DELETE | `/keys/:id`    | JWT      | Delete an API key                      |

## Source Code

GitHub: [pallavsharma505/warehouse-of-logs](https://github.com/pallavsharma505/warehouse-of-logs)

npm: [warehouse-of-logs-client](https://www.npmjs.com/package/warehouse-of-logs-client)

## License

Apache License 2.0 — Copyright 2026 Pallav Sharma.

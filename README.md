# WarehouseOfLogs 📦

WarehouseOfLogs is a high-performance, lightweight log aggregation service built with Bun, TypeScript, and SQLite. It allows applications to ship logs with custom metadata, stores them efficiently, and provides a modern React interface for monitoring, querying, and analyzing the log streams.

## Project Structure
This project is structured as a monorepo containing three main applications:
1. **`apps/collector`**: The high-throughput ingestion service that receives and writes logs.
2. **`apps/api`**: The backend service that queries the database and serves data to the frontend.
3. **`apps/frontend`**: The ReactJS UI for monitoring and searching logs.

## Documentation
- [Features](./docs/Features.md) - Core capabilities of the system.
- [Tech Stack](./docs/TechStack.md) - Tools, frameworks, and runtime details.
- [Architecture](./docs/Architecture.md) - System design and data flow.
- [Database Schema](./docs/Database-Schema.md) - SQLite table structures and indexing strategy.
- [API Contracts](./docs/API-Contracts.md) - Endpoints for ingestion and querying.
- [Plan of Action](./docs/Plan-Of-Action.md) - Step-by-step implementation guide.

## Getting Started
*(To be populated as development progresses: setup instructions, environment variables, and run commands)*
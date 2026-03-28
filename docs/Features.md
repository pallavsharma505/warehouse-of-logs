# Features

## 1. Ingestion Service (Collector)
- **Single Log Ingestion**: Accept HTTP POST requests for individual log entries.
- **Batch Ingestion**: Accept arrays of logs to minimize HTTP overhead.
- **Dynamic Metadata**: Support arbitrary JSON objects attached to logs without breaking schema constraints.
- **API Key Authentication**: Basic security to ensure only authorized apps can ship logs.

## 2. Monitoring API
- **Advanced Querying**: Search logs by text matching within the message.
- **Filtering**: Filter by severity level (INFO, WARN, ERROR), application name, or date range.
- **Pagination**: Cursor-based or offset-based pagination for endless scrolling of logs.
- **Analytics/Stats Endpoint**: Provide aggregations (e.g., "Count of errors in the last 24 hours") for dashboard charts.

## 3. Web Dashboard (Frontend)
- **Live Tail View**: A real-time (or auto-polling) view of the latest logs as they arrive.
- **Faceted Search**: UI controls to easily toggle log levels, select dates, and input search queries.
- **Log Detail Panel**: Clicking a log expands a panel to show the neatly formatted JSON metadata.
- **Dashboard Summary**: Visual charts showing log volume over time and breakdown by severity level.
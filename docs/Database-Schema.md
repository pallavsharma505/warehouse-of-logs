# Database Schema

To accommodate custom metadata while maintaining fast querying, we use a hybrid relational/JSON approach. SQLite has excellent native JSON functions.

## Table: `logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | ULID or UUID (ULID preferred for time-sorting) |
| `app_name` | TEXT | NOT NULL | Identifier for the app sending the log |
| `level` | TEXT | NOT NULL | e.g., 'INFO', 'WARN', 'ERROR', 'DEBUG' |
| `message` | TEXT | NOT NULL | The main log string |
| `metadata` | TEXT | | JSON string containing custom properties |
| `timestamp`| DATETIME| NOT NULL | When the log occurred |
| `created_at`| DATETIME| DEFAULT CURRENT_TIMESTAMP | When it was received |

## Indexes
To ensure the API service remains fast even with millions of rows:
- `idx_logs_app_name` on `(app_name)`
- `idx_logs_level` on `(level)`
- `idx_logs_timestamp` on `(timestamp DESC)`

*Note: We can query the `metadata` column using SQLite's `json_extract()` if deep filtering is added later.*
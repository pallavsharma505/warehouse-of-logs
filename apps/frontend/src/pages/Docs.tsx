const CodeBlock = ({ children }: { children: string }) => (
  <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-green-300 border border-gray-700">
    <code>{children}</code>
  </pre>
);

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-8">
    <h2 className="text-xl font-semibold text-white mb-3 border-b border-gray-800 pb-2">
      {title}
    </h2>
    <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs">
    {children}
  </code>
);

const TOC_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick Start" },
  { id: "auth", label: "Authentication" },
  { id: "ingest-single", label: "Ingest — Single Log" },
  { id: "ingest-batch", label: "Ingest — Batch" },
  { id: "query-logs", label: "Query Logs" },
  { id: "get-log", label: "Get Single Log" },
  { id: "stats", label: "Statistics" },
  { id: "apps", label: "List Applications" },
  { id: "schema", label: "Log Schema" },
  { id: "env", label: "Environment Variables" },
];

export default function Docs() {
  return (
    <div className="flex gap-8">
      {/* Sidebar TOC */}
      <nav className="hidden lg:block w-52 shrink-0 sticky top-6 self-start">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          On this page
        </h3>
        <ul className="space-y-1.5 text-sm">
          {TOC_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-gray-400 hover:text-indigo-400 transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Documentation</h1>
          <p className="text-gray-400 text-sm">
            API reference and usage guide for WarehouseOfLogs
          </p>
        </div>

        <Section id="overview" title="Overview">
          <p>
            WarehouseOfLogs is a log aggregation service with three components:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong className="text-white">Collector</strong> (port 7001) —
              receives and stores logs via HTTP POST
            </li>
            <li>
              <strong className="text-white">API</strong> (port 7002) — queries,
              filters, and aggregates stored logs
            </li>
            <li>
              <strong className="text-white">Dashboard</strong> (port 7003) —
              this web UI for monitoring and searching
            </li>
          </ul>
        </Section>

        <Section id="quickstart" title="Quick Start">
          <p>Start all services from the project root:</p>
          <CodeBlock>bun run dev</CodeBlock>
          <p>Or start individually:</p>
          <CodeBlock>
{`bun run dev:collector   # Collector on :7001
bun run dev:api          # API on :7002
bun run dev:frontend     # Dashboard on :7003`}
          </CodeBlock>
          <p>Send a test log:</p>
          <CodeBlock>
{`curl -X POST http://localhost:7001/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dev-api-key" \\
  -d '{
    "app_name": "my-service",
    "level": "INFO",
    "message": "Hello from my service!",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'`}
          </CodeBlock>
        </Section>

        <Section id="auth" title="Authentication">
          <p>
            The Collector requires a Bearer token in the{" "}
            <InlineCode>Authorization</InlineCode> header. The default
            development key is <InlineCode>dev-api-key</InlineCode>. Set a
            custom key via the <InlineCode>API_KEY</InlineCode> environment
            variable.
          </p>
          <CodeBlock>Authorization: Bearer your-api-key</CodeBlock>
          <p>
            The API service (port 7002) and Dashboard do{" "}
            <strong className="text-white">not</strong> require authentication.
          </p>
        </Section>

        <Section id="ingest-single" title="Ingest — Single Log">
          <p>
            <InlineCode>POST http://localhost:7001/ingest</InlineCode>
          </p>
          <p>Send a single log entry as a JSON object:</p>
          <CodeBlock>
{`curl -X POST http://localhost:7001/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dev-api-key" \\
  -d '{
    "app_name": "payment-service",
    "level": "ERROR",
    "message": "Failed to process stripe webhook",
    "timestamp": "2026-03-28T12:00:00Z",
    "metadata": {
      "webhook_id": "wh_12345",
      "user_id": "usr_999",
      "retries": 3
    }
  }'`}
          </CodeBlock>
          <p>
            Response: <InlineCode>201</InlineCode>
          </p>
          <CodeBlock>{`{ "message": "Log ingested" }`}</CodeBlock>
        </Section>

        <Section id="ingest-batch" title="Ingest — Batch">
          <p>
            Send an array of up to <strong className="text-white">1,000</strong>{" "}
            log entries in a single request:
          </p>
          <CodeBlock>
{`curl -X POST http://localhost:7001/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer dev-api-key" \\
  -d '[
    {
      "app_name": "auth-service",
      "level": "INFO",
      "message": "User login",
      "timestamp": "2026-03-28T12:00:00Z"
    },
    {
      "app_name": "auth-service",
      "level": "WARN",
      "message": "Rate limit approaching",
      "timestamp": "2026-03-28T12:01:00Z"
    }
  ]'`}
          </CodeBlock>
          <p>
            Response: <InlineCode>201</InlineCode>
          </p>
          <CodeBlock>{`{ "message": "Batch ingested", "count": 2 }`}</CodeBlock>
        </Section>

        <Section id="query-logs" title="Query Logs">
          <p>
            <InlineCode>GET http://localhost:7002/logs</InlineCode>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Parameter</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[
                  ["level", "string", "Filter by severity: INFO, WARN, ERROR, DEBUG"],
                  ["app_name", "string", "Filter by application name"],
                  ["search", "string", "Text search within message (max 500 chars)"],
                  ["from", "ISO datetime", "Start of time range"],
                  ["to", "ISO datetime", "End of time range"],
                  ["limit", "number", "Results per page (1–500, default 50)"],
                  ["offset", "number", "Pagination offset (default 0)"],
                ].map(([param, type, desc]) => (
                  <tr key={param}>
                    <td className="px-3 py-2">
                      <InlineCode>{param}</InlineCode>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{type}</td>
                    <td className="px-3 py-2 text-gray-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Example:</p>
          <CodeBlock>
{`curl "http://localhost:7002/logs?level=ERROR&app_name=payment-service&limit=10"`}
          </CodeBlock>
          <p>Response:</p>
          <CodeBlock>
{`{
  "data": [
    {
      "id": "01HXY...",
      "app_name": "payment-service",
      "level": "ERROR",
      "message": "Failed to process stripe webhook",
      "metadata": { "webhook_id": "wh_12345" },
      "timestamp": "2026-03-28T12:00:00Z",
      "created_at": "2026-03-28 12:00:01"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}`}
          </CodeBlock>
        </Section>

        <Section id="get-log" title="Get Single Log">
          <p>
            <InlineCode>GET http://localhost:7002/logs/:id</InlineCode>
          </p>
          <CodeBlock>{`curl http://localhost:7002/logs/01HXY...`}</CodeBlock>
          <p>
            Returns the full log entry or <InlineCode>404</InlineCode> if not
            found.
          </p>
        </Section>

        <Section id="stats" title="Statistics">
          <p>
            <InlineCode>GET http://localhost:7002/stats</InlineCode>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Parameter</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="px-3 py-2"><InlineCode>hours</InlineCode></td>
                  <td className="px-3 py-2 text-gray-400">number</td>
                  <td className="px-3 py-2 text-gray-400">
                    Lookback period (1–720, default 24)
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2"><InlineCode>app_name</InlineCode></td>
                  <td className="px-3 py-2 text-gray-400">string</td>
                  <td className="px-3 py-2 text-gray-400">
                    Optional filter by application
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Response includes totals, breakdown by level and app, hourly volume, and recent rate.</p>
          <CodeBlock>
{`{
  "period_hours": 24,
  "total": 142,
  "by_level": { "INFO": 80, "WARN": 35, "ERROR": 25, "DEBUG": 2 },
  "by_app": { "payment-service": 60, "auth-service": 82 },
  "per_hour": [{ "hour": "2026-03-28T00:00:00Z", "count": 12 }, ...],
  "recent_rate": 42
}`}
          </CodeBlock>
        </Section>

        <Section id="apps" title="List Applications">
          <p>
            <InlineCode>GET http://localhost:7002/apps</InlineCode>
          </p>
          <p>Returns an array of distinct application names that have sent logs:</p>
          <CodeBlock>{`["auth-service", "notification-service", "payment-service"]`}</CodeBlock>
        </Section>

        <Section id="schema" title="Log Schema">
          <p>Every log entry must conform to this schema:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Required</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[
                  ["app_name", "string", "Yes", "1–255 chars, identifies the sending application"],
                  ["level", "string", "Yes", "One of: INFO, WARN, ERROR, DEBUG"],
                  ["message", "string", "Yes", "1–10,000 chars, the log message"],
                  ["timestamp", "string", "Yes", "ISO 8601 datetime (e.g. 2026-03-28T12:00:00Z)"],
                  ["metadata", "object", "No", "Arbitrary JSON key-value pairs"],
                ].map(([field, type, required, desc]) => (
                  <tr key={field}>
                    <td className="px-3 py-2"><InlineCode>{field}</InlineCode></td>
                    <td className="px-3 py-2 text-gray-400">{type}</td>
                    <td className="px-3 py-2 text-gray-400">{required}</td>
                    <td className="px-3 py-2 text-gray-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="env" title="Environment Variables">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Variable</th>
                  <th className="px-3 py-2 text-left">Default</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[
                  ["API_KEY", "dev-api-key", "Bearer token for collector auth"],
                  ["COLLECTOR_PORT", "7001", "Collector service port"],
                  ["API_PORT", "7002", "API service port"],
                  ["DATABASE_PATH", "(auto)", "Custom path to SQLite database file"],
                ].map(([variable, def, desc]) => (
                  <tr key={variable}>
                    <td className="px-3 py-2"><InlineCode>{variable}</InlineCode></td>
                    <td className="px-3 py-2 text-gray-400">{def}</td>
                    <td className="px-3 py-2 text-gray-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

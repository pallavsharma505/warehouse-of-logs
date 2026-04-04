import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLogs, fetchApps, deleteLogs, downloadLogsExport } from "../api";
import type { LogEntry, LogsQueryParams } from "../api";
import { useState } from "react";

const LEVEL_BADGES: Record<string, string> = {
  ERROR: "bg-red-900/50 text-red-300 border-red-800",
  WARN: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
  INFO: "bg-blue-900/50 text-blue-300 border-blue-800",
  DEBUG: "bg-gray-800 text-gray-400 border-gray-700",
};

function LogDetailPanel({
  log,
  onClose,
}: {
  log: LogEntry;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Log Detail</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="text-gray-500 block">ID</label>
            <p className="text-gray-200 font-mono text-xs break-all">
              {log.id}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 block">App</label>
              <p className="text-gray-200">{log.app_name}</p>
            </div>
            <div>
              <label className="text-gray-500 block">Level</label>
              <span
                className={`inline-block px-2 py-0.5 rounded border text-xs ${LEVEL_BADGES[log.level] || LEVEL_BADGES.DEBUG}`}
              >
                {log.level}
              </span>
            </div>
          </div>
          <div>
            <label className="text-gray-500 block">Timestamp</label>
            <p className="text-gray-200">
              {new Date(log.timestamp).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-gray-500 block">Message</label>
            <p className="text-gray-200 whitespace-pre-wrap">{log.message}</p>
          </div>
          {log.metadata && (
            <div>
              <label className="text-gray-500 block">Metadata</label>
              <pre className="bg-gray-800 rounded p-3 text-xs text-green-300 overflow-auto max-h-64">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <label className="text-gray-500 block">Received At</label>
            <p className="text-gray-200">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-gray-500 block">Retention</label>
            {log.persist ? (
              <span className="inline-block px-2 py-0.5 rounded border text-xs bg-emerald-900/50 text-emerald-300 border-emerald-800">
                Persistent
              </span>
            ) : (
              <div>
                <span className="inline-block px-2 py-0.5 rounded border text-xs bg-orange-900/50 text-orange-300 border-orange-800">
                  Temporary
                </span>
                {log.expires_at && (
                  <p className="text-gray-400 text-xs mt-1">
                    Expires {new Date(log.expires_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LogStream() {
  const [filters, setFilters] = useState<LogsQueryParams>({
    limit: 50,
    offset: 0,
  });
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: apps } = useQuery({
    queryKey: ["apps"],
    queryFn: fetchApps,
  });

  const queryParams: LogsQueryParams = {
    ...filters,
    search: search || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["logs", queryParams],
    queryFn: () => fetchLogs(queryParams),
  });

  const updateFilter = (key: keyof LogsQueryParams, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      offset: 0, // Reset pagination on filter change
    }));
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteLogs(queryParams);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete logs");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      await downloadLogsExport(queryParams);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download logs");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Log Stream</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setFilters((p) => ({ ...p, offset: 0 }));
          }}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5 w-64"
        />
        <select
          value={filters.level || ""}
          onChange={(e) => updateFilter("level", e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          <option value="">All Levels</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        <select
          value={filters.app_name || ""}
          onChange={(e) => updateFilter("app_name", e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          <option value="">All Apps</option>
          {apps?.map((app) => (
            <option key={app} value={app}>
              {app}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={filters.from?.slice(0, 16) || ""}
          onChange={(e) =>
            updateFilter(
              "from",
              e.target.value ? new Date(e.target.value).toISOString() : ""
            )
          }
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        />
        <input
          type="datetime-local"
          value={filters.to?.slice(0, 16) || ""}
          onChange={(e) =>
            updateFilter(
              "to",
              e.target.value ? new Date(e.target.value).toISOString() : ""
            )
          }
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadAll}
          disabled={isDownloading || !data?.pagination.total}
          className="flex items-center gap-2 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"/></svg>
              Download All
            </>
          )}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting || !data?.pagination.total}
          className="flex items-center gap-2 px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Delete All
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
            <p className="text-gray-300 text-sm">
              This will permanently delete{" "}
              <strong className="text-white">{data?.pagination.total?.toLocaleString()}</strong>{" "}
              log{data?.pagination.total === 1 ? "" : "s"} matching the current filters. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Table */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Level</th>
              <th className="px-4 py-2 text-left">App</th>
              <th className="px-4 py-2 text-left">Message</th>
              <th className="px-4 py-2 text-left">Retention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No logs found
                </td>
              </tr>
            ) : (
              data?.data.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-gray-900/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded border text-xs ${LEVEL_BADGES[log.level] || LEVEL_BADGES.DEBUG}`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-300">{log.app_name}</td>
                  <td className="px-4 py-2 text-gray-300 truncate max-w-md">
                    {log.message}
                  </td>
                  <td className="px-4 py-2">
                    {log.persist ? (
                      <span className="px-2 py-0.5 rounded border text-xs bg-emerald-900/50 text-emerald-300 border-emerald-800">
                        Persistent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded border text-xs bg-orange-900/50 text-orange-300 border-orange-800">
                        Temp
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {data.pagination.offset + 1}–
            {Math.min(
              data.pagination.offset + data.pagination.limit,
              data.pagination.total
            )}{" "}
            of {data.pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={data.pagination.offset === 0}
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  offset: Math.max((p.offset ?? 0) - (p.limit ?? 50), 0),
                }))
              }
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={!data.pagination.hasMore}
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  offset: (p.offset ?? 0) + (p.limit ?? 50),
                }))
              }
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedLog && (
        <LogDetailPanel
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

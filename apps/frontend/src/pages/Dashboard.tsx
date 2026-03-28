import { useQuery } from "@tanstack/react-query";
import { fetchStats, fetchApps } from "../api";
import type { StatsResponse } from "../api";
import { useState } from "react";

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "bg-red-500",
  WARN: "bg-yellow-500",
  INFO: "bg-blue-500",
  DEBUG: "bg-gray-500",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function LevelBar({ stats }: { stats: StatsResponse }) {
  const total = stats.total || 1;
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">By Severity</h3>
      <div className="space-y-2">
        {Object.entries(stats.by_level).map(([level, count]) => (
          <div key={level} className="flex items-center gap-3">
            <span className="w-14 text-xs font-mono text-gray-300">
              {level}
            </span>
            <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full ${LEVEL_COLORS[level] || "bg-gray-600"}`}
                style={{ width: `${Math.max((count / total) * 100, 2)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeChart({ stats }: { stats: StatsResponse }) {
  const maxCount = Math.max(...stats.per_hour.map((h) => h.count), 1);
  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Volume Over Time
      </h3>
      {stats.per_hour.length === 0 ? (
        <p className="text-gray-500 text-sm">No data in this period</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {stats.per_hour.map((h) => (
            <div
              key={h.hour}
              className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-400 transition-colors"
              style={{ height: `${(h.count / maxCount) * 100}%` }}
              title={`${h.hour}: ${h.count} logs`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [hours, setHours] = useState(24);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", hours],
    queryFn: () => fetchStats(hours),
  });

  const { data: apps } = useQuery({
    queryKey: ["apps"],
    queryFn: fetchApps,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5"
        >
          <option value={1}>Last 1 hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last 7 days</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Logs" value={stats.total.toLocaleString()} />
        <StatCard label="Errors" value={stats.by_level.ERROR ?? 0} />
        <StatCard label="Warnings" value={stats.by_level.WARN ?? 0} />
        <StatCard label="Last Hour Rate" value={stats.recent_rate} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LevelBar stats={stats} />
        <VolumeChart stats={stats} />
      </div>

      {/* Top Apps */}
      <div className="rounded-lg bg-gray-900 border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Top Applications
        </h3>
        <div className="flex flex-wrap gap-2">
          {(apps ?? Object.keys(stats.by_app)).map((app) => (
            <span
              key={app}
              className="px-3 py-1 rounded-full bg-gray-800 text-sm text-gray-300 border border-gray-700"
            >
              {app}{" "}
              <span className="text-gray-500">
                ({stats.by_app[app] ?? 0})
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

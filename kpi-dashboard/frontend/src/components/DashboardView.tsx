"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DashboardData } from "@/lib/api";

function formatValue(value: number | string, unit: string): string {
  if (typeof value === "number") {
    return unit === "%" ? `${value.toFixed(1)}%` : value.toLocaleString();
  }
  return String(value);
}

function MetricCard({ metric }: { metric: DashboardData["summary"]["metrics"][0] }) {
  return (
    <div className="card">
      <div className="label">{metric.name}</div>
      <div className={`value status-${metric.status}`}>
        {formatValue(metric.value, metric.unit)}
      </div>
      {metric.target !== null && (
        <div className="target">Target: {metric.target}{metric.unit}</div>
      )}
    </div>
  );
}

export default function DashboardView({ data, schedule }: { data: DashboardData; schedule?: { schedule: string; timezone: string; next_run: string | null } }) {
  const chartData = [...data.history].reverse().map((row) => {
    const date = String(row["Date"] || row["date"] || "");
    return {
      date: date.slice(5) || date,
      success: Number(row["Success Rate %"] || row["success rate %"] || 0),
      onTime: Number(row["On-Time %"] || row["on-time %"] || 0),
      delivered: Number(row["Delivered"] || row["delivered"] || 0),
    };
  });

  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <h1>Station KPI Dashboard</h1>
          <p className="subtitle">Real-time performance tracking &amp; daily alerts</p>
        </div>
        <span className="badge">
          <span className="dot" />
          {data.station}
        </span>
      </header>

      <div className="meta">
        <span>Report Date: {data.summary.date || "—"}</span>
        <span>Last Updated: {new Date(data.last_updated).toLocaleString()}</span>
        <span>Records: {data.raw_row_count}</span>
        {schedule && (
          <>
            <span>Alert: {schedule.schedule} ({schedule.timezone})</span>
            {schedule.next_run && (
              <span>Next Alert: {new Date(schedule.next_run).toLocaleString()}</span>
            )}
          </>
        )}
      </div>

      {data.summary.overall_score !== null && (
        <div className="score-card">
          <div className="score">{data.summary.overall_score}%</div>
          <div className="score-label">Overall Performance Score</div>
        </div>
      )}

      <h2 className="section-title">Today&apos;s Metrics</h2>
      <div className="grid">
        {data.summary.metrics.map((metric) => (
          <MetricCard key={metric.name} metric={metric} />
        ))}
      </div>

      {chartData.length > 1 && (
        <>
          <h2 className="section-title">14-Day Trend</h2>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8b8b9e" fontSize={12} />
                <YAxis stroke="#8b8b9e" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="success" name="Success Rate %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="onTime" name="On-Time %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <h2 className="section-title">Alert Status</h2>
      {data.summary.alerts.length > 0 ? (
        <ul className="alerts-list">
          {data.summary.alerts.map((alert) => (
            <li
              key={alert}
              className={`alert-item${alert.includes("near") ? " warning" : ""}`}
            >
              {alert}
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-alerts">All metrics are within acceptable range.</div>
      )}
    </div>
  );
}

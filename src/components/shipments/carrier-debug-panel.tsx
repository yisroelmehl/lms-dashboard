"use client";

import { useState, useEffect } from "react";

interface CarrierLog {
  id: string;
  shipmentId: string;
  carrier: "baldar" | "dhl" | "other";
  timestamp: string;
  request: {
    body: string;
    headers: Record<string, string>;
    endpoint: string;
  };
  response: {
    status: number | null;
    body: string;
    parsedResult?: unknown;
    error?: string;
  };
}

export function CarrierDebugPanel() {
  const [logs, setLogs] = useState<CarrierLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<CarrierLog | null>(null);
  const [filter, setFilter] = useState<"all" | "baldar" | "dhl">("all");

  useEffect(() => {
    const loadLogs = () => {
      if (typeof window === "undefined") return;
      try {
        const stored = localStorage.getItem("carrier-logs-v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          setLogs(Array.isArray(parsed) ? parsed : []);
        }
      } catch (e) {
        console.error("Failed to load logs:", e);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 2000); // Auto-refresh every 2s
    return () => clearInterval(interval);
  }, []);

  const filteredLogs =
    filter === "all" ? logs : logs.filter((l) => l.carrier === filter);
  const sortedLogs = [...filteredLogs].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">🔍 Carrier Debug Logs</h2>
        <button
          onClick={() => {
            localStorage.removeItem("carrier-logs-v1");
            setLogs([]);
            setSelectedLog(null);
          }}
          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          Clear Logs
        </button>
      </div>

      <div className="flex gap-2">
        {(["all", "baldar", "dhl"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted"
            }`}
          >
            {f === "all" ? "All" : f.toUpperCase()} ({filteredLogs.length})
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Logs List */}
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">Requests</h3>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {sortedLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No logs yet</p>
            ) : (
              sortedLogs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left rounded-md border px-2 py-1 text-xs transition ${
                    selectedLog?.id === log.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono font-medium">
                        [{log.carrier.toUpperCase()}] {log.shipmentId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div
                      className={`rounded px-1 text-xs font-medium ${
                        log.response.status && log.response.status < 300
                          ? "bg-green-100 text-green-800"
                          : log.response.error
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {log.response.status || "ERR"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-lg border border-border bg-card p-4">
          {selectedLog ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Request</h4>
                <div className="space-y-1 text-xs">
                  <div>
                    <strong>Endpoint:</strong>
                    <code className="block break-all bg-muted p-1 mt-1 rounded text-xs font-mono">
                      {selectedLog.request.endpoint}
                    </code>
                  </div>
                  <div>
                    <strong>Body Preview:</strong>
                    <code className="block break-all bg-muted p-1 mt-1 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      {selectedLog.request.body.substring(0, 500)}
                      {selectedLog.request.body.length > 500 ? "..." : ""}
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Response</h4>
                <div className="space-y-1 text-xs">
                  <div>
                    <strong>Status:</strong> {selectedLog.response.status || "N/A"}
                  </div>
                  {selectedLog.response.error && (
                    <div className="rounded bg-red-50 p-2 text-red-700">
                      <strong>Error:</strong> {selectedLog.response.error}
                    </div>
                  )}
                  <div>
                    <strong>Body:</strong>
                    <code className="block break-all bg-muted p-2 mt-1 rounded text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {selectedLog.response.body.substring(0, 2000)}
                      {selectedLog.response.body.length > 2000 ? "\n\n..." : ""}
                    </code>
                  </div>
                  <div>
                    <strong>Parsed Result:</strong>
                    <code className="block bg-muted p-2 mt-1 rounded text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.response.parsedResult as any, null, 2) ?? "(empty)"}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a log to view details
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

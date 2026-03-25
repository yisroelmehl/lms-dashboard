/**
 * Utility to capture and log carrier requests/responses for debugging
 */

export interface CarrierLog {
  id: string;
  shipmentId: string;
  carrier: "baldar" | "dhl" | "other";
  timestamp: string;
  request: {
    body: string; // Raw XML/JSON
    headers: Record<string, string>;
    endpoint: string;
  };
  response: {
    status: number | null;
    body: string; // Raw response
    parsedResult?: unknown;
    error?: string;
  };
}

const LOG_STORAGE_KEY = "carrier-logs-v1";
const MAX_LOGS = 50;

function getStoredLogs(): CarrierLog[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: CarrierLog[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = logs.slice(-MAX_LOGS); // Keep only last 50
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    console.error("Failed to save carrier logs to localStorage");
  }
}

export function logCarrierRequest(log: CarrierLog) {
  const logs = getStoredLogs();
  logs.push(log);
  saveLogs(logs);
  
  // Also log to console for immediate inspection
  console.log(`[${log.carrier.toUpperCase()}] ${log.shipmentId}`, {
    timestamp: log.timestamp,
    status: log.response.status,
    error: log.response.error,
  });
}

export function getCarrierLogs(shipmentId?: string): CarrierLog[] {
  const logs = getStoredLogs();
  if (!shipmentId) return logs;
  return logs.filter((l) => l.shipmentId === shipmentId);
}

export function clearCarrierLogs() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOG_STORAGE_KEY);
}

"use client";

import { CarrierDebugPanel } from "@/components/shipments/carrier-debug-panel";

export default function CarrierDebugPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Carrier Integration Debug</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and debug requests/responses from Baldar, DHL, and other carriers
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <CarrierDebugPanel />
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
        <strong>💡 How to use:</strong>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Create or edit a shipment to trigger carrier requests</li>
          <li>Logs are stored in your browser's localStorage (persists until cleared)</li>
          <li>Click on any request to see the full raw response from the carrier</li>
          <li>Look for error messages in the Response section</li>
          <li>
            For Baldar: positive numbers = success, negative = error (e.g., -999)
          </li>
        </ul>
      </div>
    </div>
  );
}

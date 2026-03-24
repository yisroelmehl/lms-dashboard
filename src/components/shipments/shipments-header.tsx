"use client";

import { useState } from "react";
import { CreateShipmentModal } from "./create-shipment-modal";

export function ShipmentsHeader({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 משלוחים</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          + משלוח חדש
        </button>
      </div>

      {showModal && (
        <CreateShipmentModal
          onClose={() => setShowModal(false)}
          onCreated={onRefresh}
        />
      )}
    </>
  );
}

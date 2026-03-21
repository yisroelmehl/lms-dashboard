"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  token: string;
  linkId: string;
  status: string;
}

export function PaymentLinkActions({ token, linkId, status }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkSent = async () => {
    await fetch(`/api/payment-links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את הקישור?")) return;
    await fetch(`/api/payment-links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleCopy}
        className="rounded px-2 py-1 text-xs bg-primary text-white hover:bg-primary/90"
      >
        {copied ? "הועתק!" : "העתק"}
      </button>
      {status === "draft" && (
        <button
          onClick={handleMarkSent}
          className="rounded px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700"
        >
          סמן כנשלח
        </button>
      )}
      {(status === "draft" || status === "sent") && (
        <button
          onClick={handleCancel}
          className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200"
        >
          בטל
        </button>
      )}
    </div>
  );
}

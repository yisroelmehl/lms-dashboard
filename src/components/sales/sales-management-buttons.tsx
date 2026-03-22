"use client";

import { useState } from "react";
import { ManageDiscountGroupsModal } from "./manage-discount-groups-modal";
import { ManageCouponsModal } from "./manage-coupons-modal";

export function SalesManagementButtons() {
  const [showDiscountGroups, setShowDiscountGroups] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDiscountGroups(true)}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        🏷️ קבוצות הנחה
      </button>
      <button
        onClick={() => setShowCoupons(true)}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        🎟️ קופונים
      </button>

      <ManageDiscountGroupsModal
        open={showDiscountGroups}
        onClose={() => setShowDiscountGroups(false)}
      />
      <ManageCouponsModal
        open={showCoupons}
        onClose={() => setShowCoupons(false)}
      />
    </>
  );
}

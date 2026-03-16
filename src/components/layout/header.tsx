"use client";

import { signOut, useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          לוח בקרה
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              יציאה
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

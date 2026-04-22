"use client";

import { signOut, useSession } from "next-auth/react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMenuClick}
          className="flex flex-col gap-1.5 p-1 md:hidden"
          aria-label="תפריט"
        >
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
          <span className="block h-0.5 w-5 bg-foreground" />
        </button>
        <h2 className="text-base md:text-lg font-semibold text-foreground">
          ניהול לימודים
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {session?.user && (
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-border px-2 md:px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              יציאה
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

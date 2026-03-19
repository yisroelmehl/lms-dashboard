"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "לוח בקרה", icon: "🏠" },
  { href: "/students", label: "תלמידים", icon: "👥" },
  { href: "/courses", label: "קורסים", icon: "📚" },
  { href: "/lecturers", label: "מרצים", icon: "👨‍🏫" },
  { href: "/grades", label: "ציונים", icon: "📝" },
  { href: "/attendance", label: "נוכחות", icon: "✅" },
  { href: "/tasks", label: "משימות", icon: "📋" },
  { href: "/service-requests", label: "בקשות שירות", icon: "📬" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/settings", label: "הגדרות", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-l border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h1 className="text-lg font-bold text-sidebar-foreground">
          ניהול לימודים
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
          <span>מסונכרן</span>
        </div>
      </div>
    </aside>
  );
}

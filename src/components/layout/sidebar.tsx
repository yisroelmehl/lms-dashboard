"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "לוח בקרה", icon: "🏠" },
  { href: "/students/new", label: "תלמידים חדשים", icon: "🆕" },
  { href: "/students/onboarding", label: "חיבור תלמידים חדשים", icon: "🔗" },
  { href: "/students", label: "תלמידים", icon: "👥" },
  {
    href: "/students/self-study",
    label: "תלמידים עצמאיים",
    icon: "📖",
    children: [
      { href: "/students/self-study", label: "הכל", icon: "📋" },
      { href: "/students/self-study/by-topic", label: "לפי נושאים", icon: "🏷️" },
    ],
  },
  { href: "/courses", label: "קורסים", icon: "📚" },
  { href: "/lecturers", label: "מרצים", icon: "👨‍🏫" },
  { href: "/grades", label: "ציונים", icon: "📝" },
  { href: "/attendance", label: "נוכחות", icon: "✅" },
  { href: "/tasks", label: "משימות", icon: "📋" },
  { href: "/service-requests", label: "בקשות שירות", icon: "📬" },
  { href: "/shipments", label: "משלוחים", icon: "📦" },
  { href: "/sales", label: "מכירות וסליקה", icon: "💳" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/settings", label: "הגדרות", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (href: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedItems(newExpanded);
  };

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
            // More specific paths should match first
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname.startsWith(item.href) &&
                // Avoid /students matching /students/self-study when there's a more specific item
                !navItems.some(
                  (other) =>
                    other.href !== item.href &&
                    other.href.startsWith(item.href) &&
                    pathname.startsWith(other.href)
                ));

            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.href);

            return (
              <li key={item.href}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={`flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => toggleExpand(item.href)}
                      className={`px-2 py-2 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Nested items */}
                {hasChildren && isExpanded && (
                  <ul className="mr-4 mt-1 space-y-1 border-r-2 border-sidebar-accent pr-2">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                              isChildActive
                                ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            }`}
                          >
                            <span className="text-base">{child.icon}</span>
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
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

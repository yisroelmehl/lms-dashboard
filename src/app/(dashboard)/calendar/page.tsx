"use client";

import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  type: "hebrew" | "task" | "exam" | "meeting";
  description?: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | CalendarEvent["type"]>("all");

  useEffect(() => {
    async function fetchCalendarEvents() {
      try {
        const now = new Date();
        const then = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead

        const queryParams = new URLSearchParams({
          start: now.toISOString(),
          end: then.toISOString(),
        });

        const response = await fetch(`/api/calendar/events?${queryParams}`);
        if (!response.ok) throw new Error("Failed to fetch events");

        const data: CalendarEvent[] = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching calendar events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendarEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">טוען לוח שנה...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          שגיאה: {error}
        </div>
      </div>
    );
  }

  const filteredEvents = filterType === "all" 
    ? events 
    : events.filter((e) => e.type === filterType);

  const eventCounts = {
    hebrew: events.filter((e) => e.type === "hebrew").length,
    task: events.filter((e) => e.type === "task").length,
    exam: events.filter((e) => e.type === "exam").length,
    meeting: events.filter((e) => e.type === "meeting").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">לוח השנה</h1>
          <p className="text-gray-600 mt-2">לוח שנה עברי • משימות • בחינות ופגישות</p>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#9e9e9e" }}></div>
              <span className="text-sm">חגים עבריים</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#2196f3" }}></div>
              <span className="text-sm">משימות</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f44336" }}></div>
              <span className="text-sm">בחינות</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#4caf50" }}></div>
              <span className="text-sm">פגישות</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-lg shadow p-6 transition-all text-left ${
              filterType === "all"
                ? "bg-blue-100 border-2 border-blue-500"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <div className="text-3xl font-bold text-gray-900">{events.length}</div>
            <div className="text-gray-600 text-sm mt-1">כל האירועים</div>
          </button>

          <button
            onClick={() => setFilterType("hebrew")}
            className={`rounded-lg shadow p-6 transition-all text-left ${
              filterType === "hebrew"
                ? "bg-gray-100 border-2 border-gray-500"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <div className="text-3xl font-bold" style={{ color: "#9e9e9e" }}>
              {eventCounts.hebrew}
            </div>
            <div className="text-gray-600 text-sm mt-1">חגים עבריים</div>
          </button>

          <button
            onClick={() => setFilterType("task")}
            className={`rounded-lg shadow p-6 transition-all text-left ${
              filterType === "task"
                ? "bg-blue-100 border-2 border-blue-500"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <div className="text-3xl font-bold text-blue-600">
              {eventCounts.task}
            </div>
            <div className="text-gray-600 text-sm mt-1">משימות</div>
          </button>

          <button
            onClick={() => setFilterType("exam")}
            className={`rounded-lg shadow p-6 transition-all text-left ${
              filterType === "exam"
                ? "bg-red-100 border-2 border-red-500"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <div className="text-3xl font-bold text-red-600">
              {eventCounts.exam}
            </div>
            <div className="text-gray-600 text-sm mt-1">בחינות</div>
          </button>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {filterType === "all" ? "כל האירועים" : `${filterType} אירועים`}
            </h2>
            <div className="grid gap-3">
              {filteredEvents
                .sort(
                  (a, b) =>
                    new Date(a.start).getTime() - new Date(b.start).getTime()
                )
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded mt-1 flex-shrink-0"
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {event.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.start).toLocaleDateString("he-IL", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      {event.description && (
                        <div className="text-xs text-gray-500 mt-2">
                          {event.description}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {event.type === "hebrew" && "חג"}
                        {event.type === "task" && "משימה"}
                        {event.type === "exam" && "בחינה"}
                        {event.type === "meeting" && "פגישה"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                אין אירועים להצגה
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

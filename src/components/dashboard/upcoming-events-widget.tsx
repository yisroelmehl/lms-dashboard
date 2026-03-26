import { useEffect, useState } from "react";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  color: string;
  type: string;
}

export function UpcomingEventsWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const now = new Date();
        const then = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days ahead

        const queryParams = new URLSearchParams({
          start: now.toISOString(),
          end: then.toISOString(),
        });

        const response = await fetch(`/api/calendar/events?${queryParams}`);
        if (!response.ok) throw new Error("Failed to fetch events");

        const data: CalendarEvent[] = await response.json();
        setEvents(
          data
            .sort(
              (a, b) =>
                new Date(a.start).getTime() - new Date(b.start).getTime()
            )
            .slice(0, 5)
        );
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">אירועים קרובים</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "hebrew":
        return "🕯️";
      case "task":
        return "📋";
      case "exam":
        return "🎓";
      case "meeting":
        return "🤝";
      default:
        return "📅";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">אירועים קרובים</h3>
        <Link
          href="/calendar"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          הכל →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p>לא הוגדרו אירועים בעוד 14 ימים</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex-shrink-0 text-xl">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {event.title}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.start).toLocaleDateString("he-IL")}
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: event.color }}
              ></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

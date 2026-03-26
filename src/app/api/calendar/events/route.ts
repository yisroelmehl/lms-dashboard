import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HebrewCalendar } from "@hebcal/core";

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date
  end?: string;
  allDay: boolean;
  color: string;
  type: "hebrew" | "task" | "exam" | "meeting";
  description?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params for date range
    const searchParams = request.nextUrl.searchParams;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const start = startParam ? new Date(startParam) : new Date();
    const end = endParam
      ? new Date(endParam)
      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead

    const events: CalendarEvent[] = [];

    // ============================================================
    // 1. HEBREW CALENDAR EVENTS (HEBCAL)
    // ============================================================
    const hebrewEvents = getHebrewCalendarEvents(start, end);
    events.push(...hebrewEvents);

    // ============================================================
    // 2. SYSTEM TASKS & EVENTS
    // ============================================================
    const systemEvents = await getSystemEvents(start, end, session);
    events.push(...systemEvents);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

function getHebrewCalendarEvents(start: Date, end: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  try {
    // Create a HebrewCalendar instance for the date range
    const options = {
      start,
      end,
      noModern: false, // Include modern holidays
      noNikudot: true,
    };

    const hevents = HebrewCalendar.calendar(options);

    hevents.forEach((hevent) => {
      const eventDate = hevent.getDate().greg();
      const eventDesc = hevent.getDesc();

      const event: CalendarEvent = {
        id: `hebcal-${eventDate.getTime()}-${eventDesc}`,
        title: eventDesc,
        start: eventDate.toISOString().split("T")[0],
        allDay: true,
        color: getHolidayColor(eventDesc),
        type: "hebrew",
        description: `חג עברי: ${eventDesc}`,
      };

      events.push(event);
    });
  } catch (error) {
    console.error("Error getting hebrew calendar events:", error);
  }

  return events;
}

async function getSystemEvents(
  start: Date,
  end: Date,
  session: any
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const isAdmin = session.user?.role?.includes("admin");

  try {
    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        scope: true,
        students: {
          select: { studentId: true },
        },
      },
    });

    tasks.forEach((task) => {
      if (!task.dueDate) return; // Skip tasks without due date
      
      events.push({
        id: `task-${task.id}`,
        title: `📋 ${task.title}`,
        start: task.dueDate.toISOString().split("T")[0],
        allDay: true,
        color: "#2196f3",
        type: "task",
        description: `משימה: ${task.title}`,
      });
    });

    // Fetch exams (self-study next exam dates)
    if (isAdmin) {
      const exams = await prisma.selfStudyEnrollment.findMany({
        where: {
          nextExamDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          nextExamDate: true,
          student: {
            select: {
              hebrewName: true,
              firstNameOverride: true,
              lastNameOverride: true,
            },
          },
          course: {
            select: {
              fullNameMoodle: true,
              fullNameOverride: true,
            },
          },
          examUnits: true,
        },
      });

      exams.forEach((exam) => {
        if (!exam.nextExamDate) return; // Skip if no exam date
        
        const studentName =
          exam.student.hebrewName ||
          `${exam.student.firstNameOverride || ""} ${
            exam.student.lastNameOverride || ""
          }`.trim() ||
          "תלמיד";

        const courseName =
          exam.course.fullNameOverride || exam.course.fullNameMoodle || "קורס";

        events.push({
          id: `exam-${exam.id}`,
          title: `🎓 בחינה - ${studentName}`,
          start: exam.nextExamDate.toISOString().split("T")[0],
          allDay: true,
          color: "#f44336",
          type: "exam",
          description: `בחינה ב${courseName}${exam.examUnits ? ` - יחידות: ${exam.examUnits}` : ""}`,
        });
      });
    }

    // Fetch scheduled contact dates (self-study)
    if (isAdmin) {
      const contacts = await prisma.selfStudyEnrollment.findMany({
        where: {
          nextContactDate: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          nextContactDate: true,
          student: {
            select: {
              hebrewName: true,
              firstNameOverride: true,
              lastNameOverride: true,
            },
          },
        },
      });

      contacts.forEach((contact) => {
        if (!contact.nextContactDate) return; // Skip if no contact date
        
        const studentName =
          contact.student.hebrewName ||
          `${contact.student.firstNameOverride || ""} ${
            contact.student.lastNameOverride || ""
          }`.trim() ||
          "תלמיד";

        events.push({
          id: `contact-${contact.id}`,
          title: `🤝 פגישה עם ${studentName}`,
          start: contact.nextContactDate.toISOString().split("T")[0],
          allDay: true,
          color: "#4caf50",
          type: "meeting",
          description: `קשר מתוכנן עם תלמיד עצמאי`,
        });
      });
    }
  } catch (error) {
    console.error("Error getting system events:", error);
  }

  return events;
}

function getHolidayColor(holidayName: string): string {
  const colorMap: Record<string, string> = {
    // שבתות
    "Shabbat": "#9c27b0",

    // חגים גדולים
    "Pesach": "#e91e63",
    "Shavuot": "#3f51b5",
    "Rosh Hashana": "#ff5722",
    "Yom Kippur": "#673ab7",
    "Sukkot": "#ff9800",
    "Shemini Atzeret": "#ff9800",

    // ימים זיכרון ויום עצמאות
    "Tish B'Av": "#424242",
    "Lag B'Omer": "#4caf50",
    "Tu B'Shvat": "#8bc34a",
    "Tu B'Av": "#00bcd4",

    // ימי זכרון
    "Memorial Day": "#424242",
    "Independence Day": "#27ae60",
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (holidayName.includes(key)) {
      return color;
    }
  }

  return "#9e9e9e"; // default gray
}

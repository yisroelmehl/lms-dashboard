import { HDate, HebrewCalendar } from "@hebcal/core";

/**
 * Convert a Gregorian date to Hebrew date string
 * @example "26 במרץ 2026" -> "כ׳ באדר ב׳ תשפ״ו"
 */
export function toHebrewDateString(date: Date): string {
  try {
    const hdate = new HDate(date);
    return hdate.render("he");
  } catch (error) {
    console.error("Error converting to Hebrew date:", error);
    return date.toLocaleDateString("he-IL");
  }
}

/**
 * Get Hebrew holidays for a given date range
 */
export function getHebrewHolidays(start: Date, end: Date) {
  const holidays: Array<{ date: Date; name: string }> = [];
  
  try {
    const options = {
      start,
      end,
      noModern: false,
      noNikudot: true,
    };

    const hevents = HebrewCalendar.calendar(options);

    hevents.forEach((hevent) => {
      holidays.push({
        date: hevent.getDate().greg(),
        name: hevent.getDesc(),
      });
    });
  } catch (error) {
    console.error("Error getting Hebrew holidays:", error);
  }

  return holidays;
}

/**
 * Format Hebrew date with holiday info
 */
export function formatHebrewDateWithHoliday(date: Date): string {
  try {
    const hdate = new HDate(date);
    const hebrewStr = hdate.render("he");

    // Check if there's a holiday on this date
    const options = {
      start: date,
      end: date,
      noModern: false,
      noNikudot: true,
    };

    const hevents = HebrewCalendar.calendar(options);

    if (hevents.length > 0) {
      const holidayNames = hevents
        .map((h) => h.getDesc())
        .join(", ");

      if (holidayNames) {
        return `${hebrewStr} (${holidayNames})`;
      }
    }

    return hebrewStr;
  } catch (error) {
    console.error("Error formatting Hebrew date:", error);
    return date.toLocaleDateString("he-IL");
  }
}

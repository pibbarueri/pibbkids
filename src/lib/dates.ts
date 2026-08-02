/**
 * ScheduleSlot.date is a DATE column: a calendar day, not an instant. Prisma reads and
 * writes those as UTC midnight, so every Date used to query or create a slot must be
 * built at UTC midnight too. Building it at *local* midnight is what let the same Sunday
 * be stored at two different times and broke equality filters.
 */

/** The ministry runs in one timezone, so "today" always means today in Barueri. */
export const APP_TIME_ZONE = "America/Sao_Paulo";

const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's calendar date in the app timezone, as UTC midnight. */
export function today(now: Date = new Date()): Date {
  return new Date(`${YMD.format(now)}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** The given day if it already is a Sunday, otherwise the Sunday after it. */
export function nextSunday(from: Date = today()): Date {
  const day = from.getUTCDay();
  return day === 0 ? from : addDays(from, 7 - day);
}

/** Every Sunday from `start` (inclusive) through `end` (inclusive). */
export function sundaysBetween(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  let date = nextSunday(start);
  while (date <= end) {
    sundays.push(date);
    date = addDays(date, 7);
  }
  return sundays;
}

/** UTC midnight for a calendar date, for range bounds like "Jan 1" or "Dec 31". */
export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

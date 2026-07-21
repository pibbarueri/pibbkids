// Events now carry a real time-of-day, not just a date — display/bucketing must be
// pinned to America/Sao_Paulo explicitly, since this can run in the browser (no
// guaranteed TZ) as well as the server (pinned via instrumentation.ts).
const TZ = "America/Sao_Paulo";

// "YYYY-MM-DD" in BRT — for grouping events onto calendar day cells.
export function eventDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

// "21/08" — short day/month, BRT.
export function eventDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

// "12:00" or "12:00 à 18:00" when an end time is set.
export function eventTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} à ${formatTime(end)}`;
}

// For prefilling <input type="date"> / <input type="time">, both BRT-based.
export function toDateInput(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}
export function toTimeInput(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

// Combines a "YYYY-MM-DD" + "HH:mm" pair (assumed BRT, this is a Brazil-only app)
// into an ISO instant, independent of the browser's own timezone.
export function fromDateTimeInputs(date: string, time: string): string | null {
  if (!date || !time) return null;
  return `${date}T${time}:00-03:00`;
}

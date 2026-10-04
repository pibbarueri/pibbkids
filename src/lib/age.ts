// birthdate is stored as a UTC-midnight Date (parsed from a "YYYY-MM-DD" input) — use
// UTC accessors so this doesn't drift a day depending on host timezone.
export function ageInMonths(birthdate: Date, now = new Date()): number {
  let months =
    (now.getUTCFullYear() - birthdate.getUTCFullYear()) * 12 + (now.getUTCMonth() - birthdate.getUTCMonth());
  if (now.getUTCDate() < birthdate.getUTCDate()) months--;
  return Math.max(0, months);
}

/** "3 anos e 2 meses", "1 ano", "5 meses". */
export function formatAgeMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  return parts.join(" e ");
}

export function ageLabel(birthdate: Date, now = new Date()): string {
  return formatAgeMonths(ageInMonths(birthdate, now));
}

export function ageInYears(birthdate: Date, now = new Date()): number {
  return Math.floor(ageInMonths(birthdate, now) / 12);
}

// Matches the class names seeded in the DB — used only to pre-select a suggestion,
// the admin can always override it in the approve dialog.
export function suggestedClassName(birthdate: Date, now = new Date()): string {
  return suggestedClassNameForAge(ageInYears(birthdate, now));
}

export function suggestedClassNameForAge(years: number): string {
  if (years < 2) return "Berçário";
  if (years < 4) return "Primeiros Passos";
  if (years < 7) return "Ovelhinhas";
  if (years < 9) return "Detetives";
  return "Quase Lá";
}

// Visitors are children; the age steppers and the API both cap here.
export const MAX_VISITOR_AGE_YEARS = 17;
export const MAX_VISITOR_AGE_MONTHS = MAX_VISITOR_AGE_YEARS * 12 + 11;

type VisitorAge = { birthdate: string | Date | null; ageMonths: number | null };

/**
 * Visitors carry either a birthdate or just the age given on the day of the visit (never
 * both). Prefer the birthdate when there is one, since it stays correct over time.
 */
export function visitorAgeMonths(v: VisitorAge): number | null {
  if (v.birthdate) return ageInMonths(new Date(v.birthdate));
  return v.ageMonths;
}

export function visitorAgeText(v: VisitorAge): string {
  const months = visitorAgeMonths(v);
  return months === null ? "—" : formatAgeMonths(months);
}

/** The class a visitor goes to is always derived from the age, never picked by hand. */
export function visitorClassName(v: VisitorAge): string | null {
  const months = visitorAgeMonths(v);
  return months === null ? null : suggestedClassNameForAge(Math.floor(months / 12));
}

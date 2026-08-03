// birthdate is stored as a UTC-midnight Date (parsed from a "YYYY-MM-DD" input) — use
// UTC accessors so this doesn't drift a day depending on host timezone.
export function ageLabel(birthdate: Date, now = new Date()): string {
  let years = now.getUTCFullYear() - birthdate.getUTCFullYear();
  let months = now.getUTCMonth() - birthdate.getUTCMonth();
  if (now.getUTCDate() < birthdate.getUTCDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  return parts.join(" e ");
}

export function ageInYears(birthdate: Date, now = new Date()): number {
  let years = now.getUTCFullYear() - birthdate.getUTCFullYear();
  const beforeBirthdayThisYear =
    now.getUTCMonth() < birthdate.getUTCMonth() ||
    (now.getUTCMonth() === birthdate.getUTCMonth() && now.getUTCDate() < birthdate.getUTCDate());
  if (beforeBirthdayThisYear) years--;
  return years;
}

// Matches the class names seeded in the DB — used only to pre-select a suggestion,
// the admin can always override it in the approve dialog.
export function suggestedClassName(birthdate: Date, now = new Date()): string {
  const years = ageInYears(birthdate, now);
  if (years < 2) return "Berçário";
  if (years < 4) return "Primeiros Passos";
  if (years < 7) return "Ovelhinhas";
  if (years < 9) return "Detetives";
  return "Quase Lá";
}

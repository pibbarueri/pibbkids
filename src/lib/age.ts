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

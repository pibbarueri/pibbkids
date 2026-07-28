export type BirthdayPerson = { name: string; birthdate: Date; kind: "child" | "volunteer" };
export type UpcomingBirthday = { name: string; kind: "child" | "volunteer"; date: Date; label: string };

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const DAY_MS = 86400000;

// Window: [today .. end of current month], plus spillover into the next 7 days.
// Countdown suffix only within 10 days ahead; tomorrow/today special-cased.
export function computeUpcomingBirthdays(people: BirthdayPerson[], now = new Date()): UpcomingBirthday[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = today;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const plus7 = new Date(today);
  plus7.setDate(plus7.getDate() + 7);
  const upper = plus7 > endOfMonth ? plus7 : endOfMonth;

  const result: UpcomingBirthday[] = [];

  for (const p of people) {
    const bMonth = p.birthdate.getUTCMonth();
    const bDay = p.birthdate.getUTCDate();

    // Check adjacent years so a Dec/Jan window still matches.
    let chosen: Date | null = null;
    for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
      const cand = new Date(y, bMonth, bDay);
      if (cand >= start && cand <= upper) {
        chosen = cand;
        break;
      }
    }
    if (!chosen) continue;

    const diff = Math.round((chosen.getTime() - today.getTime()) / DAY_MS);
    let suffix = "";
    if (diff === 0) suffix = " (hoje 🥳)";
    else if (diff === 1) suffix = " (amanhã)";
    else if (diff > 1 && diff <= 10) suffix = ` (em ${diff} dias)`;

    const label = `${chosen.getDate()} de ${MONTHS[chosen.getMonth()]}${suffix}`;
    result.push({ name: p.name, kind: p.kind, date: chosen, label });
  }

  result.sort((a, b) => a.date.getTime() - b.date.getTime());
  return result;
}

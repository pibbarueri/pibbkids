import { dayKey } from "@/lib/dates";

export type VolunteerSlot = {
  id: string;
  date: string;
  slotType: string;
  timeSlot: string | null;
  role: string | null;
  classGroupId: string | null;
  classGroup: { id: string; name: string } | null;
  userId: string;
};

export type Person = { id: string; name: string; username: string | null; regular?: boolean };

/** Short handle for summaries: 'username', or the first name when there is none. */
export function handle(p: { name: string; username: string | null }) {
  return p.username ? `'${p.username}'` : p.name.split(" ")[0];
}

export type Candidates = {
  volunteers: Person[];
  /** slotId -> ids of volunteers eligible and free for that slot */
  availability: Record<string, string[]>;
};

export async function fetchCandidates(slotIds: string[]): Promise<Candidates> {
  if (slotIds.length === 0) return { volunteers: [], availability: {} };
  const res = await fetch(`/api/schedule/candidates?slotIds=${slotIds.join(",")}`);
  return res.json();
}

export async function postSwap(body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/schedule/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error ?? "Não foi possível trocar." };
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

// How far ahead swaps look for future slots.
const FUTURE_DAYS = 180;

/** "YYYY-MM-DD" range from today to the swap horizon. Called from event handlers only. */
export function futureRange() {
  return { from: dayKey(), to: dayKey(new Date(Date.now() + FUTURE_DAYS * 86_400_000)) };
}

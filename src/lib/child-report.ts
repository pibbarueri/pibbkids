import { Role } from "@prisma/client";
import { canManage, canViewChildReport } from "@/lib/permissions";
import { getTeacherRoomIds } from "@/lib/class-journal";

// Who can open a child's report and edit its lesson notes: management for any child, a
// teacher only for children of a room they've taught (same rule as the Diário de Sala).
export async function canAccessChildReport(
  user: { id: string; role: Role },
  child: { classGroupId: string | null }
) {
  if (!canViewChildReport(user.role)) return false;
  if (canManage(user.role)) return true;
  if (!child.classGroupId) return false;
  return (await getTeacherRoomIds(user.id)).includes(child.classGroupId);
}

// Semesters are "YYYY-1" (Jan to Jun) and "YYYY-2" (Jul to Dec), as UTC-midnight bounds.
export function semesterRange(semester: string) {
  const [year, half] = semester.split("-").map(Number);
  return half === 1
    ? { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 5, 30, 23, 59, 59)) }
    : { start: new Date(Date.UTC(year, 6, 1)), end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) };
}

export function semesterOf(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() < 6 ? 1 : 2}`;
}

export function isSemester(value: string | undefined): value is string {
  return !!value && /^\d{4}-[12]$/.test(value);
}

// A note has to fit inside one block of the one-page printout (up to 52 blocks).
export const LESSON_NOTE_MAX_LENGTH = 140;

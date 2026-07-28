import { prisma } from "@/lib/prisma";

// "Professor daquela sala" = já teve algum ScheduleSlot de TURMA naquela
// classGroupId, em qualquer data (histórico basta, sem tabela de atribuição).
export async function getTeacherRoomIds(userId: string): Promise<string[]> {
  const slots = await prisma.scheduleSlot.findMany({
    where: { userId, slotType: "TURMA", classGroupId: { not: null } },
    select: { classGroupId: true },
    distinct: ["classGroupId"],
  });
  return slots.map((s) => s.classGroupId!).filter(Boolean);
}

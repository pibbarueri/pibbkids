import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditSchedule } from "@/lib/permissions";
import { today } from "@/lib/dates";
import { ELIGIBILITY_SELECT, conflicts, isEligibleForSlot } from "@/lib/schedule";

const schema = z.discriminatedUnion("mode", [
  // Hand slots to other volunteers. Each assignment can go to a different person (bulk drag).
  z.object({
    mode: z.literal("replace"),
    assignments: z.array(z.object({ slotId: z.string().min(1), userId: z.string().min(1) })).min(1),
  }),
  // Two volunteers trade their slots.
  z.object({ mode: z.literal("permute"), slotIdA: z.string().min(1), slotIdB: z.string().min(1) }),
]);

type Assignment = { slotId: string; userId: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canEditSchedule(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Requisição inválida." }, { status: 422 });

  // Permute is two crossed assignments, validated with each other's slot excluded from the
  // conflict check (they free up each other's horário).
  const data = parsed.data;
  let assignments: Assignment[];
  if (data.mode === "permute") {
    const pair = await prisma.scheduleSlot.findMany({
      where: { id: { in: [data.slotIdA, data.slotIdB] } },
      select: { id: true, userId: true },
    });
    const a = pair.find((s) => s.id === data.slotIdA);
    const b = pair.find((s) => s.id === data.slotIdB);
    if (!a || !b) return NextResponse.json({ error: "Escala não encontrada." }, { status: 404 });
    if (a.userId === b.userId) return NextResponse.json({ error: "As duas escalas são do mesmo voluntário." }, { status: 422 });
    assignments = [
      { slotId: a.id, userId: b.userId },
      { slotId: b.id, userId: a.userId },
    ];
  } else {
    assignments = data.assignments;
  }

  const slotIds = assignments.map((x) => x.slotId);
  const userIds = [...new Set(assignments.map((x) => x.userId))];
  const [slots, users] = await Promise.all([
    prisma.scheduleSlot.findMany({ where: { id: { in: slotIds } }, include: { classGroup: { select: { name: true } } } }),
    prisma.user.findMany({ where: { id: { in: userIds }, active: true, status: "APPROVED" }, select: ELIGIBILITY_SELECT }),
  ]);
  if (slots.length !== slotIds.length) return NextResponse.json({ error: "Escala não encontrada." }, { status: 404 });

  const dates = [...new Set(slots.map((s) => s.date.toISOString()))].map((d) => new Date(d));
  const busy = await prisma.scheduleSlot.findMany({
    where: { userId: { in: userIds }, date: { in: dates }, id: { notIn: slotIds } },
    select: { userId: true, date: true, timeSlot: true },
  });

  const now = today();
  const errors: string[] = [];
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const placeOf = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId)!;
    return { date: slot.date.toISOString(), timeSlot: slot.timeSlot };
  };

  assignments.forEach(({ slotId, userId }, index) => {
    const slot = slots.find((s) => s.id === slotId)!;
    const user = users.find((u) => u.id === userId);
    const at = placeOf(slotId);
    const label = day(slot.date);

    // The same person twice in one horário within this batch (e.g. dragged onto two slots
    // of the same day).
    const doubledInBatch = assignments.some(
      (other, j) => j !== index && other.userId === userId && conflicts(placeOf(other.slotId), at)
    );
    const alreadyBusy = busy.some(
      (b) => b.userId === userId && conflicts({ date: b.date.toISOString(), timeSlot: b.timeSlot }, at)
    );

    if (slot.date < now) errors.push(`${label}: escala já passou.`);
    else if (!user) errors.push(`${label}: voluntário inativo ou inexistente.`);
    else if (!isEligibleForSlot(user, slot)) errors.push(`${label}: ${user.name} não pode servir nesse lugar.`);
    else if (alreadyBusy) errors.push(`${label}: ${user.name} já está escalado nesse horário.`);
    else if (doubledInBatch) errors.push(`${label}: ${user.name} ficaria duas vezes no mesmo horário.`);
  });
  if (errors.length > 0) return NextResponse.json({ error: errors.join("\n"), errors }, { status: 422 });

  await prisma.$transaction(
    assignments.map(({ slotId, userId }) => prisma.scheduleSlot.update({ where: { id: slotId }, data: { userId } }))
  );
  return NextResponse.json({ updated: assignments.length });
}

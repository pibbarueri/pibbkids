import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SundayType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditVisitor } from "@/lib/permissions";
import { dayKey } from "@/lib/dates";
import { ageMonthsField, classGroupIdForVisitor } from "@/lib/visitors";

const patchSchema = z
  .object({
    name: z.string().min(2).optional(),
    birthdate: z.string().min(1).optional(),
    ageMonths: ageMonthsField.optional(),
    type: z.enum(SundayType).optional(),
  })
  .refine((d) => !(d.birthdate !== undefined && d.ageMonths !== undefined), {
    message: "Informe a idade ou a data de nascimento, não os dois.",
    path: ["ageMonths"],
  });

type Guard = { ok: true } | { ok: false; response: NextResponse };

// Shared by PATCH and DELETE: who may touch this visitor, and is it still editable.
async function guard(id: string): Promise<Guard> {
  const session = await auth();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const visitor = await prisma.visitor.findUnique({ where: { id }, select: { id: true, createdAt: true, childId: true } });
  if (!visitor) return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  if (!canEditVisitor(session.user.role, dayKey(visitor.createdAt), dayKey())) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  // Once promoted to a child, the child record is the source of truth; the visit stays as history.
  if (visitor.childId) {
    return { ok: false, response: NextResponse.json({ error: "Visitante já efetivado." }, { status: 409 }) };
  }
  return { ok: true };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const visitor = await prisma.visitor.findUnique({
    where: { id },
    include: {
      classGroup: { select: { id: true, name: true } },
      createdBy: { select: { username: true } },
    },
  });

  if (!visitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canEdit = !visitor.childId && canEditVisitor(session.user.role, dayKey(visitor.createdAt), dayKey());
  return NextResponse.json({ ...visitor, canEdit });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await guard(id);
  if (!check.ok) return check.response;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const { birthdate, ageMonths, ...rest } = parsed.data;

  // Switching between birthdate and age clears the other one, so only one is ever set.
  const ageFields =
    birthdate !== undefined
      ? { birthdate: new Date(birthdate), ageMonths: null }
      : ageMonths !== undefined
        ? { birthdate: null, ageMonths }
        : null;

  const visitor = await prisma.visitor.update({
    where: { id },
    data: {
      ...rest,
      ...(ageFields && { ...ageFields, classGroupId: await classGroupIdForVisitor(ageFields) }),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });
  return NextResponse.json(visitor);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const check = await guard(id);
  if (!check.ok) return check.response;

  await prisma.visitor.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

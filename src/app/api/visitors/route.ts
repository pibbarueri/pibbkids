import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditVisitor, canLogVisitor } from "@/lib/permissions";
import { visitorAgeText } from "@/lib/age";
import { ageMonthsField, classGroupIdForVisitor } from "@/lib/visitors";
import { dayRangeUTC, dateTimeOnDay, dayKey } from "@/lib/dates";
import { SundayType } from "@prisma/client";
import { normalize } from "@/lib/text";
import { fullerName, hasSurname } from "@/lib/visitor-names";

// Reception logs either a birthdate or just the age, never both.
const schema = z
  .object({
    name: z.string().trim().refine(hasSurname, "Informe nome e sobrenome."),
    birthdate: z.string().min(1).optional(),
    ageMonths: ageMonthsField.optional(),
    date: z.string().min(1).optional(),
    type: z.enum(SundayType),
    // Reception confirmed this is the same child as an earlier visitor.
    sameAsVisitorId: z.string().min(1).optional(),
  })
  .refine((d) => (d.birthdate === undefined) !== (d.ageMonths === undefined), {
    message: "Informe a idade ou a data de nascimento.",
    path: ["ageMonths"],
  });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (date) {
    if (!canLogVisitor(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { start, end } = dayRangeUTC(date);
    const visitors = await prisma.visitor.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    const today = dayKey();
    return NextResponse.json(
      visitors.map((v) => ({
        ...v,
        canEdit: !v.childId && canEditVisitor(session.user.role, dayKey(v.createdAt), today),
      }))
    );
  }

  if (from && to) {
    const { start } = dayRangeUTC(from);
    const { end } = dayRangeUTC(to);
    const visitors = await prisma.visitor.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(visitors);
  }

  return NextResponse.json({ error: "date, or from+to, is required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canLogVisitor(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  let name = parsed.data.name;
  let birthdate = parsed.data.birthdate ? new Date(parsed.data.birthdate) : null;
  let ageMonths = birthdate ? null : parsed.data.ageMonths!;
  let classGroupId: string | null | undefined;

  // Same child as an earlier visitor: the fuller of the two names wins and is written back
  // to every earlier visit under the old name; age and turma are copied from that visitor.
  if (parsed.data.sameAsVisitorId) {
    const earlier = await prisma.visitor.findUnique({
      where: { id: parsed.data.sameAsVisitorId },
      select: { name: true, birthdate: true, ageMonths: true, classGroupId: true, childId: true },
    });
    if (!earlier || earlier.childId) {
      return NextResponse.json({ error: "Visitante anterior não encontrado." }, { status: 404 });
    }
    name = fullerName(name, earlier.name);
    birthdate = earlier.birthdate;
    ageMonths = earlier.ageMonths;
    classGroupId = earlier.classGroupId;

    const oldKey = normalize(earlier.name);
    const sameName = (
      await prisma.visitor.findMany({ where: { childId: null }, select: { id: true, name: true } })
    ).filter((v) => normalize(v.name) === oldKey && v.name !== name);
    if (sameName.length) {
      await prisma.visitor.updateMany({ where: { id: { in: sameName.map((v) => v.id) } }, data: { name } });
    }
  }

  const day = parsed.data.date ?? dayKey();

  // The confirmed child may already be logged for this same Sunday and horário (reception
  // logged her twice under different spellings). That's one visit: keep the existing record
  // instead of adding a second one. Its name was already updated above.
  if (parsed.data.sameAsVisitorId) {
    const { start, end } = dayRangeUTC(day);
    const existing = await prisma.visitor.findFirst({
      where: { childId: null, name, type: parsed.data.type, createdAt: { gte: start, lt: end } },
      include: { classGroup: { select: { id: true, name: true } } },
    });
    if (existing) {
      return NextResponse.json({ ...existing, ageText: visitorAgeText(existing) }, { status: 200 });
    }
  }

  const visitor = await prisma.visitor.create({
    data: {
      name,
      birthdate,
      ageMonths,
      type: parsed.data.type,
      classGroupId: classGroupId !== undefined ? classGroupId : await classGroupIdForVisitor({ birthdate, ageMonths }),
      createdById: session.user.id,
      createdAt: dateTimeOnDay(day),
    },
    include: { classGroup: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    { ...visitor, ageText: visitorAgeText(visitor) },
    { status: 201 }
  );
}

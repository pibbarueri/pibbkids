import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { Frequency } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(2),
  birthdate: z.string(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  frequency: z.enum(Frequency),
  allergies: z.string().optional(),
  restrictions: z.string().optional(),
  classGroupId: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (canManage(session.user.role)) {
    const children = await prisma.child.findMany({
      include: { classGroup: { select: { name: true } } },
      orderBy: [{ classGroupId: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(children);
  }

  // TEACHER/ASSISTANT/RECEPTION: only approved children in their assigned classes
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferredClasses: true },
  });
  const classIds = user?.preferredClasses.map((c) => c.classGroupId) ?? [];

  const children = await prisma.child.findMany({
    where: { classGroupId: { in: classIds } },
    include: { classGroup: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(children);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { birthdate, ...rest } = parsed.data;

  const child = await prisma.child.create({
    data: {
      ...rest,
      birthdate: new Date(birthdate),
    },
    include: { classGroup: { select: { name: true } } },
  });

  return NextResponse.json(child, { status: 201 });
}

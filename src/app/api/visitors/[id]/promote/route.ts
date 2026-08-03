import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { Frequencia } from "@prisma/client";

// Same shape as /api/register/child — "efetivar" a visitor produces a real Child record,
// same data quality as a normal approved registration.
const schema = z.object({
  name: z.string().min(2),
  birthdate: z.string().min(1),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  fatherPhone: z.string().min(8),
  motherPhone: z.string().optional(),
  frequency: z.nativeEnum(Frequencia),
  allergies: z.string().optional(),
  restrictions: z.string().optional(),
  classGroupId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const visitor = await prisma.visitor.findUnique({ where: { id } });
  if (!visitor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (visitor.childId) return NextResponse.json({ error: "Já efetivada" }, { status: 409 });

  const { birthdate, ...rest } = parsed.data;

  const child = await prisma.$transaction(async (tx) => {
    const created = await tx.child.create({
      data: { ...rest, birthdate: new Date(birthdate) },
    });
    await tx.visitor.update({ where: { id }, data: { childId: created.id } });
    return created;
  });

  return NextResponse.json(child, { status: 201 });
}

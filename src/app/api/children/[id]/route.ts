import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const child = await prisma.child.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.birthdate !== undefined && { birthdate: new Date(body.birthdate) }),
      ...(body.fatherName !== undefined && { fatherName: body.fatherName }),
      ...(body.motherName !== undefined && { motherName: body.motherName }),
      ...(body.fatherPhone !== undefined && { fatherPhone: body.fatherPhone }),
      ...(body.motherPhone !== undefined && { motherPhone: body.motherPhone }),
      ...(body.frequency !== undefined && { frequency: body.frequency }),
      ...(body.allergies !== undefined && { allergies: body.allergies }),
      ...(body.restrictions !== undefined && { restrictions: body.restrictions }),
      ...(body.classGroupId !== undefined && { classGroupId: body.classGroupId }),
      ...(body.active !== undefined && { active: body.active }),
    },
    include: { classGroup: { select: { name: true } } },
  });

  return NextResponse.json(child);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // ?hard=1 — permanent delete, used to reject a pending registration or purge
  // an inactive record for good. Otherwise: soft delete, keeps the row (and
  // attendance history), just deactivates it.
  if (req.nextUrl.searchParams.get("hard") === "1") {
    try {
      await prisma.child.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return NextResponse.json({ ok: true }); // already deleted — idempotent
        if (err.code === "P2003") {
          return NextResponse.json(
            { error: "Não é possível excluir: esta criança possui registros de presença vinculados." },
            { status: 409 }
          );
        }
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  }

  const child = await prisma.child.update({
    where: { id },
    data: { active: false },
    include: { classGroup: { select: { name: true } } },
  });
  return NextResponse.json(child);
}

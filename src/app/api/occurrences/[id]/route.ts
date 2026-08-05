import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

const INCLUDE = {
  reporter: { select: { name: true, username: true } },
  resolvedBy: { select: { name: true, username: true } },
} as const;

// Resolve/reopen — leadership only, not even the reporter can self-resolve.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const resolving = body.status === "RESOLVED";

  const occurrence = await prisma.occurrence.update({
    where: { id },
    data: {
      status: body.status,
      resolvedById: resolving ? session.user.id : null,
      resolvedAt: resolving ? new Date() : null,
    },
    include: INCLUDE,
  });

  return NextResponse.json(occurrence);
}

// Hard delete — irreversible, confirmed client-side with a typed phrase. Leadership only.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.occurrence.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ ok: true }); // already deleted — idempotent
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

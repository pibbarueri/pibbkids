import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

const INCLUDE = {
  author: { select: { name: true, username: true } },
  acknowledgedBy: { select: { name: true, username: true } },
  classGroup: { select: { id: true, name: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.classJournalEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.acknowledge === true) {
    if (!canManage(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (entry.acknowledgedAt) {
      return NextResponse.json(
        await prisma.classJournalEntry.findUnique({ where: { id }, include: INCLUDE })
      );
    }
    const updated = await prisma.classJournalEntry.update({
      where: { id },
      data: { acknowledgedById: session.user.id, acknowledgedAt: new Date() },
      include: INCLUDE,
    });
    return NextResponse.json(updated);
  }

  const isAuthor = entry.authorId === session.user.id;
  if (!isAuthor || entry.acknowledgedAt) {
    return NextResponse.json({ error: "Não é mais possível editar." }, { status: 403 });
  }

  const { title, entryDate, description } = body;
  if (!title?.trim() || !entryDate || !description?.trim()) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 422 });
  }

  const updated = await prisma.classJournalEntry.update({
    where: { id },
    data: { title, entryDate: new Date(entryDate), description },
    include: INCLUDE,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.classJournalEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = entry.authorId === session.user.id;
  const canDelete = canManage(session.user.role) || (isAuthor && !entry.acknowledgedAt);
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.classJournalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

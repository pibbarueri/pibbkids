import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, canWriteClassJournal } from "@/lib/permissions";
import { getTeacherRoomIds } from "@/lib/class-journal";

const INCLUDE = {
  author: { select: { name: true, username: true } },
  acknowledgedBy: { select: { name: true, username: true } },
  classGroup: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const where = canManage(role)
    ? {}
    : { classGroupId: { in: await getTeacherRoomIds(session.user.id) } };

  const entries = await prisma.classJournalEntry.findMany({
    where,
    include: INCLUDE,
    orderBy: { entryDate: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canWriteClassJournal(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { classGroupId, title, entryDate, description } = body;
  if (!classGroupId || !title?.trim() || !entryDate || !description?.trim()) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 422 });
  }

  const roomIds = await getTeacherRoomIds(session.user.id);
  if (!roomIds.includes(classGroupId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = await prisma.classJournalEntry.create({
    data: {
      classGroupId,
      title,
      entryDate: new Date(entryDate),
      description,
      authorId: session.user.id,
    },
    include: INCLUDE,
  });

  return NextResponse.json(entry, { status: 201 });
}

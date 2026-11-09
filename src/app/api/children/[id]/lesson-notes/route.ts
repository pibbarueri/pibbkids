import { NextRequest, NextResponse } from "next/server";
import { SundayType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChildReport, LESSON_NOTE_MAX_LENGTH } from "@/lib/child-report";

// Saves the teacher's note for one child in one lesson. An empty note deletes it.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const child = await prisma.child.findUnique({ where: { id }, select: { id: true, classGroupId: true } });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessChildReport(session.user, child))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { date, type, note } = await req.json();
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Object.values(SundayType).includes(type) ||
    typeof note !== "string" ||
    note.trim().length > LESSON_NOTE_MAX_LENGTH
  ) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const key = { childId_date_type: { childId: child.id, date: new Date(`${date}T00:00:00Z`), type } };
  const text = note.trim();
  if (!text) {
    await prisma.childLessonNote.deleteMany({ where: key.childId_date_type });
    return NextResponse.json({ note: null });
  }

  const saved = await prisma.childLessonNote.upsert({
    where: key,
    update: { note: text, authorId: session.user.id },
    create: { ...key.childId_date_type, note: text, authorId: session.user.id },
    select: { note: true, author: { select: { name: true } } },
  });
  return NextResponse.json({ note: { text: saved.note, author: saved.author.name } });
}

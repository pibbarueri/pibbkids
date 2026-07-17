import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { canManage, isLeadership } from "@/lib/permissions";

// Today at local 00:00.
function todayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const childId = searchParams.get("childId");

  const attendance = await prisma.attendance.findMany({
    where: {
      ...(date && { date: new Date(date) }),
      ...(childId && { childId }),
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(attendance);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !(session.user.role === Role.RECEPCAO || canManage(session.user.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { childId, date, tipo, present } = body;

  // Future dates: nobody can mark attendance. Past dates: admin only.
  const today = todayMidnight().getTime();
  const target = new Date(date);
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  if (targetMidnight > today) {
    return NextResponse.json({ error: "Domingo futuro" }, { status: 403 });
  }
  if (targetMidnight < today && !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Somente admin edita domingos passados" }, { status: 403 });
  }

  const attendance = await prisma.attendance.upsert({
    where: { childId_date_tipo: { childId, date: new Date(date), tipo } },
    update: { present, userId: session.user.id },
    create: { childId, date: new Date(date), tipo, present, userId: session.user.id },
  });

  return NextResponse.json(attendance, { status: 201 });
}

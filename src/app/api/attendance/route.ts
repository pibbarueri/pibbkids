import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { canManage } from "@/lib/permissions";

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

  const attendance = await prisma.attendance.upsert({
    where: { childId_date_tipo: { childId, date: new Date(date), tipo } },
    update: { present, userId: session.user.id },
    create: { childId, date: new Date(date), tipo, present, userId: session.user.id },
  });

  return NextResponse.json(attendance, { status: 201 });
}

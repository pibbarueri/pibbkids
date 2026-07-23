import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, canReportOccurrence } from "@/lib/permissions";

const INCLUDE = {
  reporter: { select: { name: true, username: true } },
  resolvedBy: { select: { name: true, username: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const occurrences = await prisma.occurrence.findMany({
    where: canManage(role) ? {} : { reporterId: session.user.id },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(occurrences);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canReportOccurrence(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { occurredAt, context, details } = body;
  if (!occurredAt || !context || !details?.trim()) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 422 });
  }

  const occurrence = await prisma.occurrence.create({
    data: {
      reporterId: session.user.id,
      occurredAt: new Date(occurredAt),
      context,
      details,
    },
    include: INCLUDE,
  });

  return NextResponse.json(occurrence, { status: 201 });
}

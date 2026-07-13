import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, isLeadership } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const showSensitive = isLeadership(session.user.role);

  const volunteers = await prisma.user.findMany({
    orderBy: [{ volunteerStatus: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      volunteerStatus: true,
      active: true,
      cpf: showSensitive,
      birthdate: showSensitive,
      motherName: showSensitive,
      functions: { select: { function: true } },
      preferredClasses: { select: { classGroupId: true, classGroup: { select: { name: true } } } },
    },
  });

  return NextResponse.json(volunteers);
}

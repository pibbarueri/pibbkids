import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (canManage(session.user.role)) {
    const children = await prisma.child.findMany({
      include: { classGroup: { select: { name: true } } },
      orderBy: [{ registrationStatus: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(children);
  }

  // PROFESSOR/AUXILIAR/RECEPCAO: only approved children in their assigned classes
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferredClasses: true },
  });
  const classIds = user?.preferredClasses.map((c) => c.classGroupId) ?? [];

  const children = await prisma.child.findMany({
    where: { registrationStatus: "APROVADO", classGroupId: { in: classIds } },
    include: { classGroup: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(children);
}

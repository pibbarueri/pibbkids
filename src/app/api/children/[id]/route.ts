import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, isLeadership } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Delete certificate file — leadership only
  if (body.revistaCertificateUrl === null && !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const child = await prisma.child.update({
    where: { id },
    data: {
      ...(body.registrationStatus !== undefined && { registrationStatus: body.registrationStatus }),
      ...(body.classGroupId !== undefined && { classGroupId: body.classGroupId }),
      ...(body.revistaCertificateUrl !== undefined && {
        revistaCertificateUrl: body.revistaCertificateUrl,
      }),
    },
    include: { classGroup: { select: { name: true } } },
  });

  return NextResponse.json(child);
}

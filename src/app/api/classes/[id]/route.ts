import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

async function requireLeadership() {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireLeadership();
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();

  const cls = await prisma.classGroup.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.ageRange !== undefined && { ageRange: body.ageRange }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return NextResponse.json(cls);
}

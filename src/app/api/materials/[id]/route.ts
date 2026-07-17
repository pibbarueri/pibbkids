import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const material = await prisma.material.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.unit !== undefined && { unit: body.unit }),
    },
  });

  return NextResponse.json(material);
}

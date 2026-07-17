import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const request = await prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: body.status,
      rejectionReason: body.status === "REJEITADO" ? body.rejectionReason || null : null,
    },
    include: {
      requester: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(request);
}

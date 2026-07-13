import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = session.user.role === Role.LIDERANCA || session.user.role === Role.COORDENACAO;

  const requests = await prisma.purchaseRequest.findMany({
    where: isManager ? {} : { requesterId: session.user.id },
    include: {
      requester: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unit: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const allowedRoles: Role[] = [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR];
  if (!session || !allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { materialId, freeTextItem, quantity, justification } = body;

  const request = await prisma.purchaseRequest.create({
    data: {
      requesterId: session.user.id,
      materialId: materialId || null,
      freeTextItem: materialId ? null : freeTextItem,
      quantity,
      justification: justification || null,
    },
    include: {
      requester: { select: { id: true, name: true } },
      material: { select: { id: true, name: true, unit: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canRequestPurchase } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || !canRequestPurchase(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.purchaseRequest.findMany({
    include: {
      requester: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canRequestPurchase(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { freeTextItem, quantity, unit, justification } = body;

  const request = await prisma.purchaseRequest.create({
    data: {
      requesterId: session.user.id,
      freeTextItem: freeTextItem || null,
      quantity,
      unit: unit || null,
      justification: justification || null,
    },
    include: {
      requester: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}

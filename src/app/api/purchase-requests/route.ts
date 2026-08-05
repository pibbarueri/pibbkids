import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canRequestPurchase } from "@/lib/permissions";

const INCLUDE = {
  requester: { select: { id: true, name: true } },
  material: { select: { id: true, name: true, unit: true, categoryId: true } },
  category: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session || !canRequestPurchase(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.purchaseRequest.findMany({
    include: INCLUDE,
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
  const { materialId, freeTextItem, description, categoryId, quantity, unit, justification } = body;

  // Picked an existing material: unit/category come from it, not the client.
  if (materialId) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { unit: true },
    });
    if (!material) {
      return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
    }
    const request = await prisma.purchaseRequest.create({
      data: {
        requesterId: session.user.id,
        materialId,
        description: description || null,
        quantity,
        unit: material.unit,
        justification: justification || null,
      },
      include: INCLUDE,
    });
    return NextResponse.json(request, { status: 201 });
  }

  // New item, not yet in Materiais: needs a category so it can become a real Material later.
  if (!freeTextItem || !categoryId) {
    return NextResponse.json({ error: "Informe o material ou nome + categoria do item novo" }, { status: 422 });
  }

  const request = await prisma.purchaseRequest.create({
    data: {
      requesterId: session.user.id,
      freeTextItem,
      description: description || null,
      categoryId,
      quantity,
      unit: unit || null,
      justification: justification || null,
    },
    include: INCLUDE,
  });

  return NextResponse.json(request, { status: 201 });
}

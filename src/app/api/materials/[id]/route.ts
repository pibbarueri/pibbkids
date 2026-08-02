import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { isMaterialCategory } from "@/lib/materials";
import { MATERIAL_INCLUDE } from "../route";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  if (body.category != null && body.category !== "" && !isMaterialCategory(body.category)) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 422 });
  }

  const material = await prisma.material.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.category !== undefined && { category: body.category || null }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.quantity !== undefined && { quantity: Number(body.quantity) }),
      ...(body.quantityDelta !== undefined && { quantity: { increment: Number(body.quantityDelta) } }),
      // Any write — including a +/- on the stepper — counts as an edit for the audit line.
      updatedById: session.user.id,
    },
    include: MATERIAL_INCLUDE,
  });

  return NextResponse.json(material);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  // Purchase requests point at the material by FK. Deleting it would either fail or
  // leave requests with no item name, so copy the name into freeTextItem first —
  // the request history stays readable after the material is gone.
  await prisma.$transaction([
    prisma.purchaseRequest.updateMany({
      where: { materialId: id },
      data: { materialId: null, freeTextItem: material.name },
    }),
    prisma.material.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}

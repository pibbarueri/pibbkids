import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canDeleteSnack, canManageSnacks } from "@/lib/permissions";
import { validateMinQuantity } from "@/lib/snacks";

async function hasApoioGeral(userId: string) {
  const f = await prisma.volunteerFunction.findFirst({
    where: { userId, function: "SUPPORT" },
  });
  return !!f;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = canManageSnacks(session.user.role, await hasApoioGeral(session.user.id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  // The quick +/- adjust (quantityDelta) is deliberately not validated: dropping below the
  // threshold is exactly what it's for. Only explicit edits of the threshold are checked.
  if (body.minQuantity !== undefined) {
    const quantity =
      body.quantity !== undefined
        ? Number(body.quantity)
        : (await prisma.snack.findUnique({ where: { id }, select: { quantity: true } }))?.quantity ?? 0;
    const error = validateMinQuantity(Number(body.minQuantity), quantity);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  const snack = await prisma.snack.update({
    where: { id },
    data: {
      ...(body.category !== undefined && { category: body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.unit !== undefined && { unit: body.unit }),
      ...(body.quantity !== undefined && { quantity: Number(body.quantity) }),
      ...(body.minQuantity !== undefined && { minQuantity: Number(body.minQuantity) }),
      ...(body.quantityDelta !== undefined && { quantity: { increment: Number(body.quantityDelta) } }),
    },
  });

  return NextResponse.json(snack);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Narrower than PATCH on purpose: Apoio Geral restocks, only management removes.
  if (!canDeleteSnack(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.snack.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

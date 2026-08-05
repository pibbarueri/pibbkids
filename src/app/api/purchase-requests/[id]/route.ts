import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";

const INCLUDE = {
  requester: { select: { id: true, name: true } },
  material: { select: { id: true, name: true, unit: true, categoryId: true } },
  category: { select: { id: true, name: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.status !== "EM_ESTOQUE") {
    const request = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: body.status,
        rejectionReason: body.status === "REJEITADO" ? body.rejectionReason || null : null,
      },
      include: INCLUDE,
    });
    return NextResponse.json(request);
  }

  // Moving to "Em estoque" feeds Materiais: bump the linked material's quantity, or
  // match-by-name/category/unit an existing one, or create a new material outright.
  const request = await prisma.$transaction(async (tx) => {
    const current = await tx.purchaseRequest.findUniqueOrThrow({ where: { id } });

    let materialId = current.materialId;
    if (materialId) {
      await tx.material.update({
        where: { id: materialId },
        data: { quantity: { increment: current.quantity }, updatedById: session.user.id },
      });
    } else {
      const existing = current.freeTextItem && current.unit
        ? await tx.material.findFirst({
            where: {
              name: { equals: current.freeTextItem, mode: "insensitive" },
              categoryId: current.categoryId,
              unit: current.unit,
            },
          })
        : null;

      if (existing) {
        materialId = existing.id;
        await tx.material.update({
          where: { id: existing.id },
          data: { quantity: { increment: current.quantity }, updatedById: session.user.id },
        });
      } else {
        const created = await tx.material.create({
          data: {
            name: current.freeTextItem ?? "Item sem nome",
            description: current.description,
            categoryId: current.categoryId,
            unit: current.unit ?? "un",
            quantity: current.quantity,
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        });
        materialId = created.id;
      }
    }

    return tx.purchaseRequest.update({
      where: { id },
      data: { status: "EM_ESTOQUE", materialId, rejectionReason: null },
      include: INCLUDE,
    });
  });

  return NextResponse.json(request);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, canViewMaterials } from "@/lib/permissions";
import { isMaterialCategory } from "@/lib/materials";

/** Audit info is shown on the detail dialog, so every read carries the two names. */
export const MATERIAL_INCLUDE = {
  createdBy: { select: { username: true } },
  updatedBy: { select: { username: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session || !canViewMaterials(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const materials = await prisma.material.findMany({
    orderBy: { name: "asc" },
    include: MATERIAL_INCLUDE,
  });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.category != null && !isMaterialCategory(body.category)) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 422 });
  }

  const material = await prisma.material.create({
    data: {
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      unit: body.unit,
      quantity: body.quantity ?? 0,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
    include: MATERIAL_INCLUDE,
  });

  return NextResponse.json(material, { status: 201 });
}

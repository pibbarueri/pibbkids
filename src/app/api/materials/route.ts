import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage, canViewMaterials } from "@/lib/permissions";
import { isSelectableCategory } from "@/lib/materials";

/** Audit info and the category label are shown on the detail dialog. */
export const MATERIAL_INCLUDE = {
  category: { select: { id: true, name: true } },
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
  const categoryId = body.categoryId || null;
  if (categoryId && !(await isSelectableCategory(categoryId))) {
    return NextResponse.json({ error: "Categoria inválida." }, { status: 422 });
  }

  const material = await prisma.material.create({
    data: {
      name: body.name,
      description: body.description || null,
      categoryId,
      unit: body.unit,
      quantity: body.quantity ?? 0,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
    include: MATERIAL_INCLUDE,
  });

  return NextResponse.json(material, { status: 201 });
}

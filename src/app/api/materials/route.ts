import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materials = await prisma.material.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const material = await prisma.material.create({
    data: {
      name: body.name,
      unit: body.unit,
      quantity: body.quantity ?? 0,
    },
  });

  return NextResponse.json(material, { status: 201 });
}

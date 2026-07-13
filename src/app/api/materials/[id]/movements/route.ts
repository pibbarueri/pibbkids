import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const movements = await prisma.stockMovement.findMany({
    where: { materialId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(movements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { delta, reason } = body;

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({ data: { materialId: id, delta, reason } }),
    prisma.material.update({ where: { id }, data: { quantity: { increment: delta } } }),
  ]);

  return NextResponse.json(movement, { status: 201 });
}

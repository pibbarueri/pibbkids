import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageSnacks } from "@/lib/permissions";
import { DEFAULT_SNACK_MIN_QUANTITY, validateMinQuantity } from "@/lib/snacks";

async function hasApoioGeral(userId: string) {
  const f = await prisma.volunteerFunction.findFirst({
    where: { userId, function: "SUPPORT" },
  });
  return !!f;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = canManageSnacks(session.user.role, await hasApoioGeral(session.user.id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snacks = await prisma.snack.findMany({ orderBy: { description: "asc" } });
  return NextResponse.json(snacks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = canManageSnacks(session.user.role, await hasApoioGeral(session.user.id));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const quantity = Number(body.quantity ?? 0);
  const minQuantity = Number(body.minQuantity ?? DEFAULT_SNACK_MIN_QUANTITY);
  const error = validateMinQuantity(minQuantity, quantity);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const snack = await prisma.snack.create({
    data: {
      category: body.category,
      description: body.description,
      quantity,
      minQuantity,
      unit: body.unit,
    },
  });

  return NextResponse.json(snack, { status: 201 });
}

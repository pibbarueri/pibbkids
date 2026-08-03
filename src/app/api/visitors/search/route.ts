import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canLogVisitor } from "@/lib/permissions";

// Autocomplete while typing a visitor's name on the "Incluir visitante" dialog — lets a
// returning visitor's birthdate get prefilled instead of retyped.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canLogVisitor(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const visitors = await prisma.visitor.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, birthdate: true },
    distinct: ["name"],
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(visitors);
}

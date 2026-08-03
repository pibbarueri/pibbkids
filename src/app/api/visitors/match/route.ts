import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

// Used when approving a pending child registration, to suggest linking it to a matching
// unlinked visitor check-in instead of leaving two separate records for the same kid.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const birthdate = searchParams.get("birthdate");
  if (!name || !birthdate) {
    return NextResponse.json({ error: "name and birthdate are required" }, { status: 400 });
  }

  const match = await prisma.visitor.findFirst({
    where: {
      childId: null,
      name: { equals: name, mode: "insensitive" },
      birthdate: new Date(birthdate),
    },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(match);
}

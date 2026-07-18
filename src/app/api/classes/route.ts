import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";

export async function GET() {
  const classes = sortClasses(
    await prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, ageRange: true },
    })
  );
  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, ageRange } = await req.json();
  const cls = await prisma.classGroup.create({ data: { name, ageRange } });
  return NextResponse.json(cls, { status: 201 });
}

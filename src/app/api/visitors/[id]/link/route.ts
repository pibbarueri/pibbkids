import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { visitsOfPerson } from "@/lib/visitor-people";

const schema = z.object({ childId: z.string().min(1) });

// A visitor whose family later filled in the registration form under a different name (or
// birthdate) ends up as two records. This links every visit of that visitor to the child
// that was registered, the same end state as "Efetivar".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { id } = await params;
  const [visits, child] = await Promise.all([
    visitsOfPerson(id),
    prisma.child.findUnique({ where: { id: parsed.data.childId }, select: { id: true } }),
  ]);
  if (!visits?.length || !child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ids = visits.filter((v) => !v.childId).map((v) => v.id);
  await prisma.visitor.updateMany({ where: { id: { in: ids } }, data: { childId: child.id } });
  return NextResponse.json({ linked: ids.length });
}

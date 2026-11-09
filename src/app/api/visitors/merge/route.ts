import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { fullerName } from "@/lib/visitor-names";
import { personKey } from "@/lib/visitor-people";

const schema = z.object({
  visitorId: z.string().min(1),
  otherVisitorIds: z.array(z.string().min(1)).min(1),
});

// "Juntar": the visitor report's retroactive fix for the same child logged under different
// names. Every visit of the chosen children gets the fullest of their names, so they group
// as one child from then on. Ages and turmas of each visit stay as they were logged.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const ids = [parsed.data.visitorId, ...parsed.data.otherVisitorIds];
  const chosen = await prisma.visitor.findMany({ where: { id: { in: ids } }, select: { name: true, childId: true } });
  if (chosen.length !== new Set(ids).size) {
    return NextResponse.json({ error: "Visitante não encontrado." }, { status: 404 });
  }
  if (chosen.some((v) => v.childId)) {
    return NextResponse.json({ error: "Visitante já efetivado não pode ser juntado." }, { status: 409 });
  }

  const keys = new Set(chosen.map((v) => personKey(v.name)));
  const name = chosen.map((v) => v.name).reduce((a, b) => fullerName(a, b));
  const visits = (await prisma.visitor.findMany({ where: { childId: null }, select: { id: true, name: true } })).filter(
    (v) => keys.has(personKey(v.name))
  );

  await prisma.visitor.updateMany({ where: { id: { in: visits.map((v) => v.id) } }, data: { name } });
  return NextResponse.json({ name, visits: visits.length });
}

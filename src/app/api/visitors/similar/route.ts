import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canLogVisitor } from "@/lib/permissions";
import { visitorAgeText } from "@/lib/age";
import { normalize } from "@/lib/text";
import { mayBeSameChild } from "@/lib/visitor-names";

// Checked before saving a new visitor: earlier visitors whose name may be the same child
// ("Luíza" vs "Luiza Silva"). One entry per distinct name, the most recent visit.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canLogVisitor(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const name = new URL(req.url).searchParams.get("name")?.trim() ?? "";
  if (!name) return NextResponse.json([]);

  const visitors = await prisma.visitor.findMany({
    where: { childId: null },
    select: { id: true, name: true, birthdate: true, ageMonths: true, classGroup: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const seen = new Set<string>();
  const matches = [];
  for (const v of visitors) {
    const key = normalize(v.name);
    if (seen.has(key) || !mayBeSameChild(v.name, name)) continue;
    seen.add(key);
    matches.push({ id: v.id, name: v.name, ageText: visitorAgeText(v), className: v.classGroup?.name ?? null });
    if (matches.length === 5) break;
  }
  return NextResponse.json(matches);
}

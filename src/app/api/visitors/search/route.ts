import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canLogVisitor } from "@/lib/permissions";
import { normalize } from "@/lib/text";

// Autocomplete while typing a visitor's name on the "Incluir visitante" dialog — lets a
// returning visitor's birthdate get prefilled instead of retyped.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canLogVisitor(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // Matched in JS so "Luiza" also finds "Luíza": Postgres `insensitive` ignores case, not
  // accents. One entry per distinct name, the most recent visit; only not-yet-promoted ones.
  const query = normalize(q);
  const all = await prisma.visitor.findMany({
    where: { childId: null },
    select: { id: true, name: true, birthdate: true, ageMonths: true },
    orderBy: { createdAt: "desc" },
  });
  const seen = new Set<string>();
  const visitors = [];
  for (const v of all) {
    const key = normalize(v.name);
    if (seen.has(key) || !key.includes(query)) continue;
    seen.add(key);
    visitors.push(v);
    if (visitors.length === 5) break;
  }

  return NextResponse.json(visitors);
}

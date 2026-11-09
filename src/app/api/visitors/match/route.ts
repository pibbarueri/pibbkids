import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { ageRoughlyMatches } from "@/lib/age";
import { mayBeSameChild } from "@/lib/visitor-names";

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

  // Same child if the names have words in common (see mayBeSameChild) and the ages are
  // within a year: the family often fills in the form with a fuller name and the real
  // birthdate, while the visit had a first name and an estimated age.
  const childBirthdate = new Date(birthdate);
  const visitors = await prisma.visitor.findMany({
    where: { childId: null },
    select: { id: true, name: true, createdAt: true, birthdate: true, ageMonths: true },
    orderBy: { createdAt: "desc" },
  });
  const found = visitors.find((v) => mayBeSameChild(v.name, name) && ageRoughlyMatches(v, childBirthdate));
  const match = found ? { id: found.id, name: found.name, createdAt: found.createdAt } : null;

  return NextResponse.json(match);
}

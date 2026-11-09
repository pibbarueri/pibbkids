import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { ageMonthsField, classGroupIdForVisitor } from "@/lib/visitors";
import { hasSurname } from "@/lib/visitor-names";
import { visitsOfPerson } from "@/lib/visitor-people";

const schema = z
  .object({
    name: z.string().trim().refine(hasSurname, "Informe nome e sobrenome."),
    birthdate: z.string().min(1).optional(),
    ageMonths: ageMonthsField.optional(),
  })
  .refine((d) => (d.birthdate === undefined) !== (d.ageMonths === undefined), {
    message: "Informe a idade ou a data de nascimento.",
    path: ["ageMonths"],
  });

// Edits the visiting child as a whole from the visitors report: name and age go to every
// not-yet-promoted visit of that child, and each visit's turma follows the new age.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { id } = await params;
  const visits = await visitsOfPerson(id);
  if (!visits?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const birthdate = parsed.data.birthdate ? new Date(parsed.data.birthdate) : null;
  const ageMonths = birthdate ? null : parsed.data.ageMonths!;
  const classGroupId = await classGroupIdForVisitor({ birthdate, ageMonths });

  const ids = visits.filter((v) => !v.childId).map((v) => v.id);
  await prisma.visitor.updateMany({
    where: { id: { in: ids } },
    data: { name: parsed.data.name, birthdate, ageMonths, classGroupId },
  });
  return NextResponse.json({ updated: ids.length });
}

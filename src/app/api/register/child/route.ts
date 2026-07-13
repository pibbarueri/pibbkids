import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Frequencia } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  birthdate: z.string(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  phone: z.string().min(8),
  whatsapp: z.string().optional(),
  frequencia: z.nativeEnum(Frequencia),
  allergies: z.string().optional(),
  restrictions: z.string().optional(),
  parentExpectations: z.string().optional(),
  parentConsent: z.literal(true, { message: "Termo de ciência obrigatório" }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { birthdate, parentConsent, ...rest } = parsed.data;

  const child = await prisma.child.create({
    data: {
      ...rest,
      birthdate: new Date(birthdate),
      parentConsent,
      registrationStatus: "PENDENTE",
    },
  });

  return NextResponse.json({ id: child.id }, { status: 201 });
}

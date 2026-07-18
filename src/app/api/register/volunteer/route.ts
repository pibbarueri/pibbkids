import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FunctionType, Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  cpf: z.string().min(11),
  birthdate: z.string().min(1),
  motherName: z.string().optional(),
  functions: z.array(z.nativeEnum(FunctionType)).min(1),
  preferredClassIds: z.array(z.string()).optional(),
});

// Public self-registration: no username/password. Stays PENDING until an admin
// approves it, assigns a username + access level, and flags first-access.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { functions, preferredClassIds, birthdate, ...rest } = parsed.data;

  const user = await prisma.user.create({
    data: {
      ...rest,
      birthdate: new Date(birthdate),
      role: Role.AUXILIAR,
      status: "PENDING",
      functions: { create: functions.map((f) => ({ function: f })) },
      preferredClasses: preferredClassIds?.length
        ? { create: preferredClassIds.map((id) => ({ classGroupId: id })) }
        : undefined,
    },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, username: true, phone: true, cpf: true, birthdate: true, motherName: true },
  });
  return NextResponse.json(user);
}

// Self-service profile edit: personal data + password only. Never role/functions/classes.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.newPassword !== undefined && String(body.newPassword).length < 6) {
    return NextResponse.json({ error: "Senha mínima de 6 caracteres." }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.cpf !== undefined && { cpf: body.cpf }),
      ...(body.birthdate !== undefined && { birthdate: body.birthdate ? new Date(body.birthdate) : null }),
      ...(body.motherName !== undefined && { motherName: body.motherName }),
      ...(body.newPassword && {
        password: await bcrypt.hash(body.newPassword, 12),
        requirePasswordChange: false,
      }),
    },
    select: { id: true, name: true, username: true, phone: true, cpf: true, birthdate: true, motherName: true },
  });
  return NextResponse.json(user);
}

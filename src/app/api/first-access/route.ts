import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

// Public first-access: identity check (birthdate + CPF) then set the first password.
// This is the only credential a brand-new volunteer has, so it doubles as auth.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, cpf, birthdate, newPassword } = body;

  if (!username || !cpf || !birthdate || !newPassword) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 422 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: "Senha mínima de 6 caracteres." }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { username: String(username) } });

  const identityOk =
    user &&
    user.active &&
    user.requirePasswordChange &&
    digits(user.cpf) === digits(cpf) &&
    user.birthdate &&
    user.birthdate.toISOString().slice(0, 10) === String(birthdate);

  // Same generic message whether the user is missing or the data doesn't match.
  if (!identityOk) {
    return NextResponse.json({ error: "Dados não conferem. Confira usuário, CPF e data de nascimento." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(String(newPassword), 12), requirePasswordChange: false },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getBoolSetting, SETTING_FIRST_ACCESS_BYPASS_CPF } from "@/lib/settings";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

// Public first-access: identity check (birthdate + CPF) then set the first password.
// This is the only credential a brand-new volunteer has, so it doubles as auth.
//
// Bypass flag: imported volunteers may have no CPF/birthdate on record (never filled
// the form). When first_access_bypass_cpf is on, a user WITHOUT a stored CPF may set
// their password by typing their data, which is saved (no verification). Users who DO
// have a stored CPF are always verified strictly, even with bypass on.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, cpf, birthdate, motherName, newPassword } = body;

  if (!username || !cpf || !birthdate || !newPassword) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 422 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: "Senha mínima de 6 caracteres." }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { username: String(username) } });
  if (!user || !user.active || !user.requirePasswordChange) {
    return NextResponse.json({ error: "Dados não conferem. Confira usuário, CPF e data de nascimento." }, { status: 401 });
  }

  const bypass = await getBoolSetting(SETTING_FIRST_ACCESS_BYPASS_CPF);
  const hasStoredCpf = !!digits(user.cpf);

  // Bypass only relaxes users with NO stored CPF; verified users stay strict.
  const bypassPath = bypass && !hasStoredCpf;

  const strictOk =
    digits(user.cpf) === digits(cpf) &&
    !!user.birthdate &&
    user.birthdate.toISOString().slice(0, 10) === String(birthdate);

  if (!bypassPath && !strictOk) {
    return NextResponse.json({ error: "Dados não conferem. Confira usuário, CPF e data de nascimento." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(String(newPassword), 12),
      requirePasswordChange: false,
      // On the bypass path, persist the identity data the volunteer typed.
      ...(bypassPath && {
        cpf: digits(cpf),
        birthdate: new Date(String(birthdate)),
        ...(motherName ? { motherName: String(motherName) } : {}),
      }),
    },
  });

  return NextResponse.json({ ok: true });
}

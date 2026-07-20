import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/text";
import { phoneDigits } from "@/lib/phone";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const NOT_FOUND = "Não encontramos seu cadastro. Confira nome e telefone.";
const CHALLENGE_FAIL = "Dados não conferem. Tente novamente.";

// Find the single volunteer matching name (accent/case-insensitive token match) + phone.
async function findUser(name: string, phone: string) {
  const ph = phoneDigits(phone);
  if (!name?.trim() || !ph) return null;

  const candidates = await prisma.user.findMany({
    where: { active: true, requirePasswordChange: true, phone: ph },
    select: { id: true, name: true, username: true, cpf: true, motherName: true, birthdate: true },
  });

  const tokens = normalize(name).split(" ").filter(Boolean);
  const matches = candidates.filter((u) => {
    const n = normalize(u.name);
    return tokens.every((t) => n.includes(t));
  });
  return matches.length === 1 ? matches[0] : null;
}

type MatchedUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;

function challengeType(u: MatchedUser): "cpf" | "mother" | "birthdate" | "none" {
  if (digits(u.cpf).length >= 5) return "cpf";
  if (u.motherName?.trim()) return "mother";
  if (u.birthdate) return "birthdate";
  return "none";
}

function fakeCpfPrefixes(real: string, n: number): string[] {
  const out = new Set<string>([real]);
  while (out.size < n + 1) out.add(String(Math.floor(100 + Math.random() * 900)));
  return [...out];
}

function fakeDates(real: { day: number; month: number }, n: number): { day: number; month: number }[] {
  const key = (d: { day: number; month: number }) => `${d.day}-${d.month}`;
  const seen = new Set<string>([key(real)]);
  const out = [real];
  while (out.length < n + 1) {
    const d = { day: 1 + Math.floor(Math.random() * 28), month: 1 + Math.floor(Math.random() * 12) };
    if (!seen.has(key(d))) {
      seen.add(key(d));
      out.push(d);
    }
  }
  return out;
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const step = body.step;

  // ── Step 1: identify + return the identity challenge ──────────────────────
  if (step === "start") {
    const user = await findUser(body.name, body.phone);
    if (!user) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    const type = challengeType(user);

    if (type === "cpf") {
      const prefix = digits(user.cpf).slice(0, 3);
      const cpfOptions = shuffle(fakeCpfPrefixes(prefix, 3)).map((p) => ({
        prefix: p,
        label: `${p}.***.***-**`,
      }));
      return NextResponse.json({ challenge: "cpf", userId: user.id, cpfOptions });
    }

    if (type === "mother") {
      return NextResponse.json({ challenge: "mother", userId: user.id });
    }

    if (type === "birthdate") {
      const bd = user.birthdate!;
      const real = { day: bd.getUTCDate(), month: bd.getUTCMonth() + 1 };
      const dateOptions = shuffle(fakeDates(real, 3)).map((d) => ({
        day: d.day,
        month: d.month,
        label: `${d.day} de ${MONTHS[d.month - 1]}`,
      }));
      return NextResponse.json({ challenge: "birthdate", userId: user.id, dateOptions });
    }

    return NextResponse.json(
      { error: "Cadastro sem dados de confirmação. Procure a liderança." },
      { status: 422 }
    );
  }

  // ── Step 2: verify challenge + set the first password ─────────────────────
  if (step === "complete") {
    const { userId, name, phone, newPassword, cpfPrefix, cpfLast2, motherName, day, month } = body;

    if (!newPassword || String(newPassword).length < 6 || String(newPassword).length > 70) {
      return NextResponse.json({ error: "Senha deve ter entre 6 e 70 caracteres." }, { status: 422 });
    }

    // Re-validate identity from scratch (stateless; never trust the start step).
    const check = await findUser(name, phone);
    const user = check && check.id === userId ? check : null;
    if (!user) return NextResponse.json({ error: NOT_FOUND }, { status: 401 });

    const type = challengeType(user);
    let ok = false;
    if (type === "cpf") {
      const d = digits(user.cpf);
      ok = String(cpfPrefix) === d.slice(0, 3) && digits(cpfLast2) === d.slice(-2);
    } else if (type === "mother") {
      ok = !!motherName && normalize(motherName) === normalize(user.motherName ?? "");
    } else if (type === "birthdate") {
      const bd = user.birthdate!;
      ok = Number(day) === bd.getUTCDate() && Number(month) === bd.getUTCMonth() + 1;
    }

    if (!ok) return NextResponse.json({ error: CHALLENGE_FAIL }, { status: 401 });

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(String(newPassword), 12), requirePasswordChange: false },
    });
    return NextResponse.json({ ok: true, username: user.username });
  }

  return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
}

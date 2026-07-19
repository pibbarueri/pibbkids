import { PrismaClient, Role, FunctionType, Frequencia } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { phoneDigits } from "../src/lib/phone";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const warnings: string[] = [];

function parseBrDate(s: string): Date | null {
  const v = (s ?? "").trim();
  if (!v) return null;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (isNaN(date.getTime())) return null;
  return date;
}

function parseEnDate(s: string): Date | null {
  const v = (s ?? "").trim();
  if (!v) return null;
  const date = new Date(v);
  if (isNaN(date.getTime())) return null;
  return date;
}

function normNo(v: string): string | null {
  const t = (v ?? "").trim();
  if (["", "não", "nao", "no"].includes(t.toLowerCase())) return null;
  return t;
}

function slug(name: string): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const usedUsernames = new Set<string>();
function uniqueUsername(name: string): string {
  const base = slug(name);
  if (!usedUsernames.has(base)) {
    usedUsernames.add(base);
    return base;
  }
  let n = 2;
  while (usedUsernames.has(base + n)) n++;
  const u = base + n;
  usedUsernames.add(u);
  return u;
}

const FUNCTION_MAP: Record<string, FunctionType> = {
  Professor: FunctionType.PROFESSOR,
  Auxiliar: FunctionType.AUXILIAR,
  "Apoio geral": FunctionType.APOIO_GERAL,
  Louvor: FunctionType.LOUVOR,
  Recepção: FunctionType.RECEPCAO,
  Recepcão: FunctionType.RECEPCAO,
  Eventos: FunctionType.EVENTS,
  "Ide Kids": FunctionType.IDE_KIDS,
  "Mídias e Design": FunctionType.MIDIAS_DESIGN,
};

function parseFunctions(raw: string, name: string): FunctionType[] {
  const out: FunctionType[] = [];
  for (const tok of (raw ?? "").split(",").map((t) => t.trim()).filter(Boolean)) {
    const mapped = FUNCTION_MAP[tok];
    if (!mapped) {
      warnings.push(`Volunteer "${name}": unknown function "${tok}" (skipped)`);
      continue;
    }
    if (!out.includes(mapped)) out.push(mapped);
  }
  return out;
}

async function main() {
  const classes = await prisma.classGroup.findMany();
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  let volunteersCreated = 0;
  let childrenCreated = 0;

  // ─── Volunteers ───────────────────────────────────────────────────────────
  const volRows: Record<string, string>[] = parse(readFileSync("data/voluntarios.csv"), {
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
  });

  for (const row of volRows) {
    const name = row.Name;
    const fns = parseFunctions(row["Função"], name);

    let role: Role;
    if (fns.includes(FunctionType.PROFESSOR)) role = Role.TEACHER;
    else if (fns.includes(FunctionType.RECEPCAO)) role = Role.RECEPTIONIST;
    else if (fns.includes(FunctionType.AUXILIAR)) role = Role.ASSISTANT;
    else role = Role.ASSISTANT;

    const turma = (row.Turma ?? "").trim();
    const ids: string[] = [];
    if (turma) {
      const id = classByName.get(turma);
      if (id) ids.push(id);
      else warnings.push(`Volunteer "${name}": unknown Turma "${turma}"`);
    }

    await prisma.user.create({
      data: {
        name,
        active: row.Ativo === "Sim",
        birthdate: parseEnDate(row["Data Nasc."]),
        role,
        status: "APPROVED",
        requirePasswordChange: true,
        password: null,
        cpf: null,
        phone: null,
        motherName: null,
        documentUrl: null,
        username: uniqueUsername(name),
        functions: { create: fns.map((f) => ({ function: f as FunctionType })) },
        preferredClasses: { create: ids.map((classGroupId) => ({ classGroupId })) },
      },
    });
    volunteersCreated++;
  }

  // ─── Children ──────────────────────────────────────────────────────────────
  const childRows: Record<string, string>[] = parse(readFileSync("data/criancas.csv"), {
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
  });

  for (const row of childRows) {
    const name = row["Nome da Criança"];

    const birthdate = parseBrDate(row["Data de Nasc."]);
    if (!birthdate) {
      warnings.push(`Child "${name}": missing/invalid birthdate (skipped)`);
      continue;
    }

    const freqRaw = (row["Frequência"] ?? "").trim();
    let frequency: Frequencia;
    if (freqRaw === "Culto") frequency = Frequencia.CULTO;
    else if (freqRaw === "EBD") frequency = Frequencia.EBD;
    else if (freqRaw === "EBD e Culto") frequency = Frequencia.AMBOS;
    else {
      warnings.push(`Child "${name}": unknown Frequência "${freqRaw}" (skipped)`);
      continue;
    }

    const turma = (row.Turma ?? "").trim();
    const classGroupId = classByName.get(turma);
    if (!classGroupId) {
      warnings.push(`Child "${name}": unknown Turma "${turma}" (skipped)`);
      continue;
    }

    await prisma.child.create({
      data: {
        name,
        active: row.Ativo === "Yes",
        motherPhone: phoneDigits(row["Contato da Mãe"] || "") || null,
        fatherPhone: phoneDigits(row["Contato do Pai"] || "") || null,
        restrictions: normNo(row["Cuidados especiais?"]),
        birthdate,
        frequency,
        motherName: row["Nome da mãe"] || null,
        fatherName: row["Nome do pai"] || null,
        allergies: normNo(row["Restrições e alergias"]),
        classGroupId,
      },
    });
    childrenCreated++;
  }

  console.log(`✓ ${volunteersCreated} volunteers created`);
  console.log(`✓ ${childrenCreated} children created`);
  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} warnings:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

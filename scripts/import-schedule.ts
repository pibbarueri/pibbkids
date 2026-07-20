import { PrismaClient, SlotType, SlotRole, Frequencia } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const warnings: string[] = [];

const MONTHS: Record<string, number> = {
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZ: 12,
};

// Nickname -> username. Only Ago-Dez is imported; Fev/Mar rows are skipped by month filter.
const NICKNAME_MAP: Record<string, string> = {
  "ana cris": "ana",
  anne: "anne",
  aparecida: "aparecida",
  beatriz: "beatriz",
  cristina: "cristina",
  damiana: "damiana",
  danubia: "danubia",
  debora: "debora",
  gessyca: "gessyca",
  giovanna: "giovanna",
  indyanara: "indyanara",
  isabely: "isabely",
  isa: "isabela",
  jacione: "jacione",
  jessica: "jessica",
  joyce: "joyce",
  juliana: "juliana",
  leonardo: "leonardo.trindade",
  "leonardo trindade": "leonardo.trindade",
  "léo": "leonardo",
  lindinha: "lindinha",
  marcelo: "marcelo",
  matheus: "matheus",
  miguel: "miguel",
  naianne: "naianne",
  natally: "natally",
  nattaly: "natally",
  nivaldo: "nivaldo",
  raquel: "raquel",
  rafael: "rafael",
  silviane: "silviane",
  talita: "talita",
  tati: "tatiana",
  tatiana: "tatiana",
  thais: "thais",
  thayná: "thayna",
  thiago: "thiago",
  vitoria: "vitoria",
  "vitória": "vitoria",
  wellington: "wellington",
  help: "help",
};

// Deliberately unresolvable: person left the ministry, no user account exists.
const KNOWN_UNMATCHED = new Set(["izabela", "ana paula", "kelly"]);

type SlotDef = {
  col: number;
  slotType: SlotType;
  horario: Frequencia | null;
  classGroupName: string | null;
  role: SlotRole | null;
  splitBoth?: boolean; // true = the single column value applies to both EBD and CULTO
};

const COLUMNS: SlotDef[] = [
  { col: 4, slotType: "COORDENACAO", horario: null, classGroupName: null, role: null, splitBoth: true },
  { col: 6, slotType: "SALA_PLUS", horario: null, classGroupName: null, role: null },
  { col: 8, slotType: "RECEPCAO", horario: "EBD", classGroupName: null, role: null },
  { col: 9, slotType: "RECEPCAO", horario: "CULTO", classGroupName: null, role: null },
  { col: 10, slotType: "LANCHE", horario: "CULTO", classGroupName: null, role: null },
  { col: 12, slotType: "TURMA", horario: null, classGroupName: "Berçário", role: "PROFESSOR", splitBoth: true },
  { col: 14, slotType: "TURMA", horario: "EBD", classGroupName: "Primeiros Passos", role: "PROFESSOR" },
  { col: 15, slotType: "TURMA", horario: "CULTO", classGroupName: "Primeiros Passos", role: "PROFESSOR" },
  { col: 16, slotType: "TURMA", horario: null, classGroupName: "Primeiros Passos", role: "AUXILIAR", splitBoth: true },
  { col: 18, slotType: "TURMA", horario: "EBD", classGroupName: "Ovelhinhas", role: "PROFESSOR" },
  { col: 19, slotType: "TURMA", horario: "CULTO", classGroupName: "Ovelhinhas", role: "PROFESSOR" },
  { col: 20, slotType: "TURMA", horario: null, classGroupName: "Ovelhinhas", role: "AUXILIAR", splitBoth: true },
  { col: 22, slotType: "TURMA", horario: "EBD", classGroupName: "Detetives", role: "PROFESSOR" },
  { col: 23, slotType: "TURMA", horario: "CULTO", classGroupName: "Detetives", role: "PROFESSOR" },
  { col: 25, slotType: "TURMA", horario: "EBD", classGroupName: "Quase Lá", role: "PROFESSOR" },
  { col: 26, slotType: "TURMA", horario: "CULTO", classGroupName: "Quase Lá", role: "PROFESSOR" },
];

async function main() {
  const classes = await prisma.classGroup.findMany();
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const userByUsername = new Map(users.map((u) => [u.username, u.id]));

  const rows: string[][] = parse(readFileSync("data/escala.csv"), {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  let curMonth = "";
  let created = 0;

  for (const row of rows.slice(4)) {
    if (row[0]?.trim()) curMonth = row[0].trim();
    const dia = row[2]?.trim();
    if (!dia) continue;
    if (!(curMonth in MONTHS)) continue; // only Ago-Dez

    const date = new Date(Date.UTC(2026, MONTHS[curMonth] - 1, Number(dia)));
    const dateLabel = `${dia}/${curMonth}`;

    for (const def of COLUMNS) {
      const raw = (row[def.col] ?? "").trim();
      if (!raw || raw === "---") continue;

      const key = raw.trim().toLowerCase();
      const username = NICKNAME_MAP[key];
      const userId = username ? userByUsername.get(username) : undefined;

      if (!userId) {
        if (!KNOWN_UNMATCHED.has(key)) {
          warnings.push(`${dateLabel} col${def.col}: unrecognized nickname "${raw}"`);
        } else {
          warnings.push(`${dateLabel} col${def.col}: "${raw}" no longer in ministry (skipped)`);
        }
        continue;
      }

      const classGroupId = def.classGroupName ? classByName.get(def.classGroupName) ?? null : null;
      if (def.classGroupName && !classGroupId) {
        warnings.push(`${dateLabel} col${def.col}: unknown turma "${def.classGroupName}"`);
        continue;
      }

      const horarios: (Frequencia | null)[] = def.splitBoth ? ["EBD", "CULTO"] : [def.horario];
      for (const horario of horarios) {
        await prisma.scheduleSlot.create({
          data: {
            date,
            slotType: def.slotType,
            horario,
            classGroupId,
            role: def.role,
            userId,
          },
        });
        created++;
      }
    }
  }

  console.log(`✓ ${created} schedule slots created`);
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

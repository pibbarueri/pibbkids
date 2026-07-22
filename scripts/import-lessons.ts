import { PrismaClient, LessonType, SundayTipo } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const warnings: string[] = [];
const YEAR = 2026;
const HEADER_ROW = 3; // "Maternal 5 - Obedecendo a Deus (16 licoes)" etc — one journal per column group, for the whole semester.
const DATA_ROW_START = 6;
const DATA_ROW_END = 23; // inclusive — 29/11 wrap-up row

// Column layout: 4 turmas x (EBD, CULTO), each group is [Data, Material, ATIVIDADE, (Horário de subida)?].
type Group = { turma: string; tipo: SundayTipo; dataCol: number; matCol: number; atvCol: number; horCol: number | null };
const GROUPS: Group[] = [
  { turma: "Primeiros Passos", tipo: "EBD", dataCol: 1, matCol: 2, atvCol: 3, horCol: null },
  { turma: "Primeiros Passos", tipo: "CULTO", dataCol: 5, matCol: 6, atvCol: 7, horCol: 8 },
  { turma: "Ovelhinhas", tipo: "EBD", dataCol: 10, matCol: 11, atvCol: 12, horCol: null },
  { turma: "Ovelhinhas", tipo: "CULTO", dataCol: 14, matCol: 15, atvCol: 16, horCol: 17 },
  { turma: "Detetives", tipo: "EBD", dataCol: 19, matCol: 20, atvCol: 21, horCol: null },
  { turma: "Detetives", tipo: "CULTO", dataCol: 23, matCol: 24, atvCol: 25, horCol: 26 },
  { turma: "Quase Lá", tipo: "EBD", dataCol: 28, matCol: 29, atvCol: 30, horCol: null },
  { turma: "Quase Lá", tipo: "CULTO", dataCol: 32, matCol: 33, atvCol: 34, horCol: 35 },
];

function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Best-effort keyword match against ATIVIDADE free text. Order matters — checked in sequence.
function matchLessonType(raw: string): LessonType {
  const n = normalize(raw);
  if (n.includes("apostila")) return "APOSTILA";
  if (n.includes("sem aula")) return "SEM_AULA";
  if (n.includes("revis")) return "REVIEW";
  if (n.includes("quiz") || n.includes("ginca")) return "QUIZ_GINCANA";
  if (n.includes("extra")) return "AULA_EXTRA";
  return "TEMA_LIVRE";
}

function parseLicaoNumber(material: string): number | null {
  const m = material.match(/li[cç][aã]o\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function parseDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  return new Date(YEAR, Number(m[2]) - 1, Number(m[1]));
}

// Header cell format: "[EBD|CULTO -] <Série> <edição> - <título> (<N> semanas|licoes)" or
// "... - <título> - <N> licoes" (trailing dash instead of parens). The edition number is
// the first "<digits> -" after stripping an optional leading "EBD -"/"CULTO -" tag; the
// weeks/lições count is the number immediately before "semanas"/"licoes"/"lições" anywhere.
function parseJournalHeader(raw: string): { edition: number | null; weeks: number | null } {
  const cleaned = raw.replace(/^(EBD|CULTO)\s*-\s*/i, "");
  const editionMatch = cleaned.match(/(\d+)\s*-/);
  const weeksMatch = raw.match(/(\d+)\s*li[cç][õo]es|(\d+)\s*semanas/i);
  const weeks = weeksMatch ? Number(weeksMatch[1] ?? weeksMatch[2]) : null;
  return { edition: editionMatch ? Number(editionMatch[1]) : null, weeks };
}

async function main() {
  const classes = await prisma.classGroup.findMany();
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  const journals = await prisma.journal.findMany();

  const rows: string[][] = parse(readFileSync("data/aulas.csv"), {
    bom: true,
    skip_empty_lines: false,
  });

  const deleted = await prisma.sundayPlan.deleteMany({});
  console.log(`Aulas removidas: ${deleted.count}`);

  // One journal per column group for the whole semester — resolved once, reused for every row.
  const journalByGroup = new Map<Group, string | null>();
  for (const g of GROUPS) {
    const classGroupId = classByName.get(g.turma);
    if (!classGroupId) {
      warnings.push(`Turma "${g.turma}" não encontrada no banco`);
      continue;
    }
    const headerRaw = rows[HEADER_ROW]?.[g.dataCol]?.trim() ?? "";
    if (!headerRaw) {
      warnings.push(`Sem cabeçalho de revista para ${g.turma}/${g.tipo}`);
      continue;
    }
    const { edition, weeks } = parseJournalHeader(headerRaw);
    if (edition === null) {
      warnings.push(`Não consegui extrair edição de "${headerRaw}" (${g.turma}/${g.tipo})`);
      continue;
    }
    const journal = journals.find(
      (j) => j.classGroupId === classGroupId && (j.usage === g.tipo || j.usage === "AMBOS") && j.edition === edition
    );
    if (!journal) {
      warnings.push(`Sem revista casando ${g.turma}/${g.tipo} edição ${edition} ("${headerRaw}")`);
      journalByGroup.set(g, null);
      continue;
    }
    journalByGroup.set(g, journal.id);
    if (weeks !== null && journal.totalWeeks !== weeks) {
      await prisma.journal.update({ where: { id: journal.id }, data: { totalWeeks: weeks } });
      console.log(`Revista "${journal.title}" (${g.turma}/${journal.usage}): semanas ${journal.totalWeeks ?? "—"} -> ${weeks}`);
    }
  }

  let created = 0;

  for (let r = DATA_ROW_START; r <= DATA_ROW_END; r++) {
    const row = rows[r];
    if (!row) continue;

    for (const g of GROUPS) {
      const dateRaw = row[g.dataCol]?.trim();
      const material = row[g.matCol]?.trim() ?? "";
      const atividade = row[g.atvCol]?.trim() ?? "";
      const horario = g.horCol !== null ? row[g.horCol]?.trim() : "";

      if (!dateRaw || !atividade) continue;

      const date = parseDate(dateRaw);
      if (!date) {
        warnings.push(`Data inválida "${dateRaw}" (${g.turma} ${g.tipo}, linha ${r + 1})`);
        continue;
      }

      const classGroupId = classByName.get(g.turma);
      if (!classGroupId) continue; // already warned above

      const lessonType = matchLessonType(atividade);
      const licaoNumber = lessonType === "APOSTILA" ? parseLicaoNumber(material) : null;
      const journalId = lessonType === "APOSTILA" ? journalByGroup.get(g) ?? null : null;

      // Extra descriptive text beyond a clean type match, plus "horário de subida", goes to observations.
      const isCleanMatch = normalize(atividade) === normalize(
        lessonType === "APOSTILA" ? "apostila" : lessonType === "SEM_AULA" ? "sem aula" : atividade
      );
      const obsParts: string[] = [];
      if (!isCleanMatch && lessonType !== "TEMA_LIVRE") obsParts.push(atividade);
      if (lessonType === "TEMA_LIVRE") obsParts.push(atividade);
      if (horario) obsParts.push(`Horário de subida: ${horario}`);
      const observations = obsParts.length > 0 ? obsParts.join(" | ") : null;

      const specialTitle = ["AULA_EXTRA", "REVIEW", "QUIZ_GINCANA"].includes(lessonType) ? atividade : null;

      await prisma.sundayPlan.create({
        data: {
          date,
          classGroupId,
          tipo: g.tipo,
          journalId,
          licaoNumber,
          lessonType,
          specialTitle,
          observations,
        },
      });
      created++;
    }
  }

  console.log(`Aulas importadas: ${created}`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} avisos:`);
    for (const w of warnings) console.log(" -", w);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

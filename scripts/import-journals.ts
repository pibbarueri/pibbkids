import { PrismaClient, SeriesType, Frequencia } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const warnings: string[] = [];

const SERIES_MAP: Record<string, SeriesType> = {
  "culto infantil": SeriesType.CULTO_INFANTIL,
  detetive: SeriesType.DETETIVE,
  juniores: SeriesType.JUNIORES,
  maternal: SeriesType.MATERNAL,
  pluguinho: SeriesType.PLUGUINHO,
};

function parseUsage(raw: string): Frequencia | null {
  const v = raw.trim().toLowerCase();
  if (v === "culto") return Frequencia.CULTO;
  if (v === "ebd") return Frequencia.EBD;
  if (v === "ebd e culto") return Frequencia.AMBOS;
  return null;
}

function parseIntOrZero(raw: string): number {
  const n = Number((raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseBool(raw: string): boolean {
  return (raw ?? "").trim().toLowerCase() === "sim";
}

async function main() {
  const classes = await prisma.classGroup.findMany();
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  const rows: Record<string, string>[] = parse(readFileSync("data/revistas.csv"), {
    columns: true,
    bom: true,
    trim: true,
    skip_empty_lines: true,
  });

  let created = 0;

  for (const row of rows) {
    const title = row["Revista"];
    const tipo = (row["Tipo"] ?? "").trim().toLowerCase();
    const series = SERIES_MAP[tipo];
    if (!series) {
      warnings.push(`"${title}": unknown Tipo "${row["Tipo"]}" (skipped)`);
      continue;
    }

    const edition = Number((row["Numero"] ?? "").trim());
    if (!Number.isFinite(edition)) {
      warnings.push(`"${title}": invalid Numero "${row["Numero"]}" (skipped)`);
      continue;
    }

    const usage = parseUsage(row["Uso"] ?? "");
    if (!usage) {
      warnings.push(`"${title}" (${row["Numero"]}): unknown Uso "${row["Uso"]}" (skipped)`);
      continue;
    }

    const weeksRaw = (row["Semanas"] ?? "").trim();
    const totalWeeks = weeksRaw ? Number(weeksRaw) : null;

    const studentRaw = (row["Revistas de Aluno"] ?? "").trim();
    const studentCopies = ["", "n/a", "-"].includes(studentRaw.toLowerCase())
      ? 0
      : parseIntOrZero(studentRaw);

    const teacherCopies = parseIntOrZero(row["Revistas de Prof"] ?? "");
    const hasVisualResources = parseBool(row["Recurcos Visuais"] ?? "");

    // "Maiores" isn't a real ClassGroup — it means the journal covers both Detetives and Quase Lá.
    const sala = (row["Sala"] ?? "").trim();
    const salaNames = sala === "Maiores" ? ["Detetives", "Quase Lá"] : [sala];

    for (const salaName of salaNames) {
      const classGroupId = classByName.get(salaName);
      if (!classGroupId) {
        warnings.push(`"${title}" (${row["Numero"]}): unknown Sala "${salaName}" (skipped)`);
        continue;
      }

      await prisma.journal.create({
        data: {
          title,
          series,
          edition,
          totalWeeks,
          classGroupId,
          usage,
          teacherCopies,
          studentCopies,
          hasVisualResources,
        },
      });
      created++;
    }
  }

  console.log(`✓ ${created} journals created`);
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

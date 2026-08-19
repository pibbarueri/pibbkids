import fs from "fs";
import path from "path";

export type ChangelogEntry = { version: string; date: string; items: string[] };

const HEADING = /^##\s+(\S+)\s+-\s+(\d{4}-\d{2}-\d{2})/;

export function readChangelog(): ChangelogEntry[] {
  const raw = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf-8");
  const sections = raw.split(/\n(?=## )/).filter((s) => s.startsWith("## "));
  return sections
    .map((s) => {
      const [heading, ...lines] = s.split("\n");
      const match = heading.match(HEADING);
      if (!match) return null;
      const items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
      return { version: match[1], date: match[2], items };
    })
    .filter((e): e is ChangelogEntry => e !== null);
}

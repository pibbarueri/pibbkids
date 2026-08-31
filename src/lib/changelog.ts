import fs from "fs";
import path from "path";

export type ChangelogItem = { text: string; description?: string };
export type ChangelogEntry = { version: string; date: string; items: ChangelogItem[] };

const HEADING = /^##\s+(\S+)\s+-\s+(\d{4}-\d{2}-\d{2})/;

export function readChangelog(): ChangelogEntry[] {
  const raw = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf-8");
  const sections = raw.split(/\n(?=## )/).filter((s) => s.startsWith("## "));
  return sections
    .map((s) => {
      const [heading, ...lines] = s.split("\n");
      const match = heading.match(HEADING);
      if (!match) return null;

      // A line starting with "- " is a new item; an indented line right after it (not
      // itself a "- " bullet) is that item's description, not a separate item.
      const items: ChangelogItem[] = [];
      for (const line of lines) {
        if (line.startsWith("- ")) {
          items.push({ text: line.slice(2).trim() });
        } else if (/^\s+\S/.test(line) && items.length > 0) {
          const current = items[items.length - 1];
          current.description = current.description ? `${current.description} ${line.trim()}` : line.trim();
        }
      }

      return { version: match[1], date: match[2], items };
    })
    .filter((e): e is ChangelogEntry => e !== null);
}

import { normalize } from "@/lib/text";

// Pure helpers (no Prisma) so the visitor form can use them in the browser too.

export function nameTokens(name: string): string[] {
  return normalize(name).split(" ").filter(Boolean);
}

/** A visitor needs at least a first name and one surname. */
export function hasSurname(name: string): boolean {
  return nameTokens(name).filter((t) => t.length >= 2).length >= 2;
}

/**
 * "Luíza" and "Luiza Silva" may be the same child: same first name (ignoring accents and
 * case), and every word of the shorter name appears in the longer one.
 */
export function mayBeSameChild(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length || ta[0] !== tb[0]) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

/** The more complete of two names: more words wins, then the longer one. */
export function fullerName(a: string, b: string): string {
  const ta = nameTokens(a).length;
  const tb = nameTokens(b).length;
  if (ta !== tb) return ta > tb ? a.trim() : b.trim();
  return a.trim().length >= b.trim().length ? a.trim() : b.trim();
}

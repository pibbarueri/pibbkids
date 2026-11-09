import { normalize } from "@/lib/text";

// Pure helpers (no Prisma) so the visitor form can use them in the browser too.

export function nameTokens(name: string): string[] {
  return normalize(name).split(" ").filter(Boolean);
}

/** A visitor needs at least a first name and one surname. */
export function hasSurname(name: string): boolean {
  return nameTokens(name).filter((t) => t.length >= 2).length >= 2;
}

// One edit (a letter added, removed or swapped for another) between two words.
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Two name words are the same ignoring accents and case. Words of 5+ letters also tolerate
 * one typo ("Catharia" / "Catharina"); short ones don't, or "Ana" would match "Ina".
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && withinOneEdit(a, b);
}

/**
 * "Luíza" and "Luiza Silva" may be the same child: same first name, and every word of the
 * shorter name appears in the longer one (both allowing one typo per long word).
 */
export function mayBeSameChild(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length || !sameWord(ta[0], tb[0])) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.some((l) => sameWord(t, l)));
}

/**
 * The more complete of two names. For two names of the same child, it keeps the one with
 * more words and, word by word, the longer spelling: "Catharia Morais" + "Catharina" gives
 * "Catharina Morais". Otherwise more words wins, then the longer one.
 */
export function fullerName(a: string, b: string): string {
  const wa = a.trim().split(/\s+/);
  const wb = b.trim().split(/\s+/);
  const [base, other] =
    wa.length !== wb.length ? (wa.length > wb.length ? [wa, wb] : [wb, wa]) : a.trim().length >= b.trim().length ? [wa, wb] : [wb, wa];
  if (!mayBeSameChild(a, b)) return base.join(" ");
  return base
    .map((w) => {
      const match = other.find((o) => sameWord(nameTokens(w)[0] ?? "", nameTokens(o)[0] ?? ""));
      return match && match.length > w.length ? match : w;
    })
    .join(" ");
}

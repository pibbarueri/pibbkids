// Canonical turma order used everywhere turmas are listed (filters, dropdowns, lists).
export const CLASS_ORDER = [
  "Berçário",
  "Primeiros Passos",
  "Ovelhinhas",
  "Detetives",
  "Quase Lá",
];

function rank(name: string): number {
  const i = CLASS_ORDER.indexOf(name);
  return i === -1 ? CLASS_ORDER.length : i;
}

// Sort by canonical order; unknown names go last, alphabetically.
export function sortClasses<T extends { name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const d = rank(a.name) - rank(b.name);
    return d !== 0 ? d : a.name.localeCompare(b.name, "pt-BR");
  });
}

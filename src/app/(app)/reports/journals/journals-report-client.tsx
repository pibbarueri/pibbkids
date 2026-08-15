"use client";

import { useState } from "react";
import { ClassFilterChips } from "@/components/reports/class-filter-chips";
import { PrintZoomControl, DEFAULT_PRINT_ZOOM } from "@/components/reports/print-zoom-control";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { SlidersHorizontal } from "lucide-react";

type ClassGroup = { id: string; name: string };
type Row = {
  id: string;
  classGroupId: string;
  className: string;
  series: string;
  edition: number;
  title: string;
  totalWeeks: number | null;
  usage: string;
  hasVisualResources: boolean;
  studentCopies: number;
  teacherCopies: number;
  planned: number;
  done: number;
};

const COLUMNS = [
  { key: "className", label: "Turma", width: "min-w-[120px]" },
  { key: "series", label: "Série", width: "min-w-[110px]" },
  { key: "edition", label: "Edição", width: "min-w-[70px]" },
  { key: "title", label: "Título", width: "min-w-[180px]" },
  { key: "totalWeeks", label: "Semanas", width: "min-w-[90px]" },
  { key: "usage", label: "Uso", width: "min-w-[80px]" },
  { key: "hasVisualResources", label: "Recursos visuais?", width: "min-w-[110px]" },
  { key: "studentCopies", label: "Estoque aluno", width: "min-w-[80px]" },
  { key: "teacherCopies", label: "Estoque prof.", width: "min-w-[90px]" },
  { key: "planned", label: "Aulas com plano", width: "min-w-[110px]" },
  { key: "done", label: "Aulas concluídas", width: "min-w-[120px]" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];
const ALL_COLUMNS = new Set<ColumnKey>(COLUMNS.map((c) => c.key));

function cellContent(col: ColumnKey, row: Row, seriesLabels: Record<string, string>, usageLabels: Record<string, string>) {
  switch (col) {
    case "className":
      return row.className;
    case "series":
      return seriesLabels[row.series] ?? row.series;
    case "edition":
      return row.edition;
    case "title":
      return row.title;
    case "totalWeeks":
      return row.totalWeeks ?? "—";
    case "usage":
      return usageLabels[row.usage] ?? row.usage;
    case "hasVisualResources":
      return row.hasVisualResources ? "Sim" : "Não";
    case "studentCopies":
      return row.studentCopies;
    case "teacherCopies":
      return row.teacherCopies;
    case "planned":
      return row.planned;
    case "done":
      return row.done;
  }
}

export function JournalsReportClient({
  rows,
  classes,
  seriesLabels,
  usageLabels,
}: {
  rows: Row[];
  classes: ClassGroup[];
  seriesLabels: Record<string, string>;
  usageLabels: Record<string, string>;
}) {
  const [selectedClasses, setSelectedClasses] = useState<Set<string> | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(ALL_COLUMNS);
  const [zoom, setZoom] = useState(DEFAULT_PRINT_ZOOM);

  const visibleRows = rows.filter((r) => selectedClasses === null || selectedClasses.has(r.classGroupId));
  const columns = COLUMNS.filter((c) => visibleColumns.has(c.key));

  function toggleColumn(key: ColumnKey) {
    const next = new Set(visibleColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisibleColumns(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <ClassFilterChips classes={classes} selected={selectedClasses} onChange={setSelectedClasses} />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="no-print shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input hover:bg-accent"
            aria-label="Colunas visíveis"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={visibleColumns.has(c.key)}
                onCheckedChange={() => toggleColumn(c.key)}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto border rounded-lg" style={{ zoom: `${zoom}%` }}>
        <table className="text-sm w-max">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`sticky top-0 bg-muted p-2 text-left ${c.width} ${
                    i < columns.length - 1 ? "border-r" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => (
              <tr key={r.id} className="border-t">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={`p-2 align-top ${i < columns.length - 1 ? "border-r" : ""} ${c.key === "title" ? "wrap-anywhere" : ""}`}
                  >
                    {cellContent(c.key, r, seriesLabels, usageLabels)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma revista cadastrada.</p>
        )}
      </div>
      <PrintZoomControl zoom={zoom} onChange={setZoom} />
    </div>
  );
}

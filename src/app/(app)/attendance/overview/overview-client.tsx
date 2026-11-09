"use client";

type ClassGroup = { id: string; name: string };
type AttendanceRow = { date: string; type: string; classGroupId: string | null };
// `day` is the visit's calendar day (YYYY-MM-DD, app timezone).
type VisitorRow = { day: string; type: string; classGroupId: string | null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

export function OverviewClient({
  attendance,
  visitors = [],
  classes,
  sundays,
}: {
  attendance: AttendanceRow[];
  visitors?: VisitorRow[];
  classes: ClassGroup[];
  sundays: string[];
}) {
  function countFor(sunday: string, classGroupId: string, tipo: string) {
    const key = sunday.slice(0, 10);
    return attendance.filter(
      (a) => a.date.startsWith(key) && a.classGroupId === classGroupId && a.type === tipo
    ).length;
  }

  function visitorsFor(sunday: string, classGroupId: string, tipo: string) {
    const key = sunday.slice(0, 10);
    return visitors.filter((v) => v.day === key && v.classGroupId === classGroupId && v.type === tipo).length;
  }

  function cell(sunday: string, classGroupId: string, tipo: string, label: string) {
    const v = visitorsFor(sunday, classGroupId, tipo);
    return (
      <p className="text-xs">
        {label}: {countFor(sunday, classGroupId, tipo)}
        {v > 0 && <span className="text-chart-2 font-medium"> · Visitantes: {v}</span>}
      </p>
    );
  }

  return (
    <div className="overflow-auto border rounded-lg max-h-[70vh]">
      <table className="text-sm w-max">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky top-0 left-0 bg-muted p-2 text-left border-r z-20 min-w-[80px]">Domingo</th>
            {classes.map((cls) => (
              <th key={cls.id} className="sticky top-0 bg-muted p-2 text-left border-r z-10 min-w-[140px]">{cls.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sundays.map((sunday) => (
            <tr key={sunday} className="border-t">
              <td className="sticky left-0 bg-background p-2 border-r font-medium z-10">
                {formatDate(sunday)}
              </td>
              {classes.map((cls) => (
                <td key={cls.id} className="p-2 border-r align-top">
                  {cell(sunday, cls.id, "EBD", "EBD")}
                  {cell(sunday, cls.id, "CULTO", "Culto")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

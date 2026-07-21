const SLOT_LABELS: Record<string, string> = {
  COORDENACAO: "Coordenação",
  SALA_PLUS: "Sala Plus",
  RECEPCAO: "Recepção",
  LANCHE: "Lanche",
};

const ROLE_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
};

const HORARIO_LABELS: Record<string, string> = { EBD: "EBD", CULTO: "Culto" };

type Slot = {
  id: string;
  slotType: string;
  horario: string | null;
  role: string | null;
  user: { name: string };
  classGroup: { name: string } | null;
};

function slotDescription(slot: Slot) {
  if (slot.classGroup) {
    const cargo = slot.role ? ROLE_LABELS[slot.role] : null;
    return cargo ? `${cargo} - ${slot.classGroup.name}` : slot.classGroup.name;
  }
  return SLOT_LABELS[slot.slotType] ?? slot.slotType;
}

export function NextSundaySchedule({ date, slots }: { date: string; slots: Slot[] }) {
  const label = new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });

  // Group by horário (EBD/Culto) instead of turma — Sala Plus has no horário, gets its own bucket.
  const byGroup = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slot.horario ? HORARIO_LABELS[slot.horario] : SLOT_LABELS[slot.slotType] ?? slot.slotType;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(slot);
  }
  const order = ["EBD", "Culto"];
  const groups = [...byGroup.entries()].sort(
    (a, b) => (order.includes(a[0]) ? order.indexOf(a[0]) : order.length) - (order.includes(b[0]) ? order.indexOf(b[0]) : order.length)
  );

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-background">
      <p className="font-medium text-sm">Próxima escala: {label}</p>
      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Você não está na escala deste domingo.</p>
      )}
      {groups.map(([group, groupSlots]) => (
        <div key={group} className="text-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{group}</p>
          {groupSlots.map((slot) => (
            <p key={slot.id}>{slotDescription(slot)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

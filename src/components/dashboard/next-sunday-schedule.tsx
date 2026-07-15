const SLOT_LABELS: Record<string, string> = {
  SALA_PLUS: "Sala Plus",
  APOIO_EBD: "Apoio EBD",
  APOIO_CULTO: "Apoio Culto",
  LANCHE: "Lanche",
  EBD: "EBD",
  CULTO: "Culto",
};

const ROLE_LABELS: Record<string, string> = {
  PROFESSOR: "Professor",
  AUXILIAR: "Auxiliar",
};

type Slot = {
  id: string;
  slotType: string;
  role: string;
  user: { name: string };
  classGroup: { name: string } | null;
};

export function NextSundaySchedule({ date, slots }: { date: string; slots: Slot[] }) {
  const label = new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });

  const byGroup = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = slot.classGroup?.name ?? SLOT_LABELS[slot.slotType];
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(slot);
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-background">
      <p className="font-medium text-sm">Escala — {label}</p>
      {byGroup.size === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Escala ainda não definida.</p>
      )}
      {[...byGroup.entries()].map(([group, groupSlots]) => (
        <div key={group} className="text-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{group}</p>
          {groupSlots.map((slot) => (
            <p key={slot.id}>
              {slot.classGroup ? `${SLOT_LABELS[slot.slotType]} ${ROLE_LABELS[slot.role]}` : ROLE_LABELS[slot.role] ?? SLOT_LABELS[slot.slotType]}: {slot.user.name}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

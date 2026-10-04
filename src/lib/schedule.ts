export type EligibilityVolunteer = {
  role: string;
  inclusionEnabled: boolean;
  preferredClasses: { classGroupId: string }[];
  functions: { function: string }[];
};

export type SlotShape = {
  slotType: string;
  classGroupId: string | null;
  role: string | null;
  timeSlot: string | null;
};

/** Prisma select that yields an EligibilityVolunteer (plus id/name). */
export const ELIGIBILITY_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  inclusionEnabled: true,
  preferredClasses: { select: { classGroupId: true } },
  functions: { select: { function: true } },
} as const;

/**
 * Who may fill a slot. Shared by the Escala picker, the volunteer-schedule swap dialogs and the
 * swap API, so all three agree. Sala Plus has no requirement.
 */
export function isEligibleForSlot(v: EligibilityVolunteer, slot: Pick<SlotShape, "slotType" | "classGroupId">) {
  switch (slot.slotType) {
    case "CLASS":
      return v.preferredClasses.some((c) => c.classGroupId === slot.classGroupId);
    case "COORDINATOR":
      return v.role === "ADMIN" || v.role === "COORDINATOR";
    case "RECEPTION":
      return v.functions.some((f) => f.function === "RECEPTION");
    case "INCLUSION":
      return v.inclusionEnabled;
    case "SNACK":
      return v.functions.some((f) => f.function === "SUPPORT");
    default:
      return true;
  }
}

const SLOT_TYPE_LABELS: Record<string, string> = {
  COORDINATOR: "Coordenação",
  ROOM_PLUS: "Sala Plus",
  RECEPTION: "Recepção",
  SNACK: "Lanche",
  INCLUSION: "Inclusão",
};

/** "Detetives · Professor", "Recepção". Horário is added by the caller when relevant. */
export function slotPlaceLabel(slot: Pick<SlotShape, "slotType" | "role"> & { classGroup?: { name: string } | null }) {
  if (slot.slotType === "CLASS") {
    const role = slot.role === "ASSISTANT" ? "Auxiliar" : "Professor";
    return `${slot.classGroup?.name ?? "Turma"} · ${role}`;
  }
  return SLOT_TYPE_LABELS[slot.slotType] ?? slot.slotType;
}

export function timeSlotLabel(timeSlot: string | null) {
  return timeSlot === "CULTO" ? "Culto" : timeSlot === "EBD" ? "EBD" : null;
}

/** "na EBD" (Escola Bíblica Dominical, feminine) / "no Culto"; empty for Sala Plus. */
export function timeSlotPhrase(timeSlot: string | null) {
  return timeSlot === "CULTO" ? "no Culto" : timeSlot === "EBD" ? "na EBD" : "";
}

/** Slots of the "same seat": same type, class and role. Used to group the bulk-swap view. */
export function slotKindKey(slot: Pick<SlotShape, "slotType" | "classGroupId" | "role">) {
  return `${slot.slotType}|${slot.classGroupId ?? ""}|${slot.role ?? ""}`;
}

/** A volunteer can't hold two slots on the same day and horário (Sala Plus has none). */
export function conflicts(a: { date: string; timeSlot: string | null }, b: { date: string; timeSlot: string | null }) {
  return a.date.slice(0, 10) === b.date.slice(0, 10) && a.timeSlot === b.timeSlot;
}

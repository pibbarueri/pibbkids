import { Role } from "@prisma/client";

export const MANAGEMENT_ROLES: Role[] = [Role.ADMIN, Role.COORDINATOR];
export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST, Role.SUPPORT];

export function canManage(role: Role) {
  return MANAGEMENT_ROLES.includes(role);
}

export function isLeadership(role: Role) {
  return role === Role.ADMIN;
}

export function canEditSchedule(role: Role) {
  return MANAGEMENT_ROLES.includes(role);
}

export function canViewSensitiveData(role: Role) {
  return role === Role.ADMIN;
}

export function canRequestPurchase(role: Role) {
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST, Role.SUPPORT] as Role[]).includes(role);
}

export function canViewMaterials(role: Role) {
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST, Role.SUPPORT] as Role[]).includes(role);
}

// Snacks stock: management edits everything; Apoio Geral volunteers can also
// stock/adjust it, even though that's a FunctionType, not a Role. SUPPORT and
// RECEPTIONIST also get Lanches access.
export function canManageSnacks(role: Role, hasApoioGeral: boolean) {
  return canManage(role) || hasApoioGeral || role === Role.SUPPORT || role === Role.RECEPTIONIST;
}

// Removing an item is narrower than restocking it: Apoio Geral adjusts quantities all the
// time, but dropping a row is management-only so a stock run can't quietly lose an item.
export function canDeleteSnack(role: Role) {
  return canManage(role);
}

export function canViewAttendanceOverview(role: Role) {
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER] as Role[]).includes(role);
}

// Occurrence reports: any non-management staff can file one; only ADMIN/COORDINATOR
// see and resolve them (leadership doesn't file reports, it reviews them).
export function canReportOccurrence(role: Role) {
  return !canManage(role);
}

// Diário de Sala: only TEACHER can author entries; ADMIN/COORDINATOR review + acknowledge.
export function canWriteClassJournal(role: Role) {
  return role === Role.TEACHER;
}

// Quick visitor check-in on the attendance screen: same roles allowed to mark attendance.
export function canLogVisitor(role: Role) {
  return role === Role.RECEPTIONIST || canManage(role);
}

export function canViewLessons(role: Role) {
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] as Role[]).includes(role);
}

// Who isn't management (ADMIN/COORDINATOR) but still sees every class's lesson plan, not
// just their own — today only Receptionist, who covers the front desk for any class.
export function canViewAllLessons(role: Role) {
  return canManage(role) || role === Role.RECEPTIONIST;
}

import { Role } from "@prisma/client";

export const MANAGEMENT_ROLES: Role[] = [Role.ADMIN, Role.COORDINATOR];
export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST];

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
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST] as Role[]).includes(role);
}

export function canViewMaterials(role: Role) {
  return ([Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST] as Role[]).includes(role);
}

// Snacks stock: management edits everything; Apoio Geral volunteers can also
// stock/adjust it, even though that's a FunctionType, not a Role.
export function canManageSnacks(role: Role, hasApoioGeral: boolean) {
  return canManage(role) || hasApoioGeral;
}

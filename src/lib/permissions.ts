import { Role } from "@prisma/client";

export const MANAGEMENT_ROLES: Role[] = [Role.LIDERANCA, Role.COORDENACAO];
export const STAFF_ROLES: Role[] = [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR, Role.AUXILIAR, Role.RECEPCAO];

export function canManage(role: Role) {
  return MANAGEMENT_ROLES.includes(role);
}

export function isLeadership(role: Role) {
  return role === Role.LIDERANCA;
}

export function canEditSchedule(role: Role) {
  return MANAGEMENT_ROLES.includes(role);
}

export function canViewSensitiveData(role: Role) {
  return role === Role.LIDERANCA;
}

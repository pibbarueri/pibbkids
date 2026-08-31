import { Role } from "@prisma/client";
import {
  Users,
  CalendarDays,
  BookOpen,
  Home,
  ClipboardCheck,
  Cookie,
  NotebookPen,
  ShoppingCart,
  PartyPopper,
  Package,
  type LucideIcon,
} from "lucide-react";
import { canManageSnacks } from "@/lib/permissions";

export type NavDestination = {
  /** Stable key persisted in user_settings — never rename without a data migration. */
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  /**
   * Roles that get this in the bottom nav by default (before customizing).
   * Mirrors the original hardcoded NAV_ITEMS so nothing moves for existing users.
   */
  navRoles?: Role[];
};

const ALL_ROLES: Role[] = [
  Role.ADMIN,
  Role.COORDINATOR,
  Role.TEACHER,
  Role.ASSISTANT,
  Role.RECEPTIONIST,
  Role.SUPPORT,
];

/** Always first in the bottom nav and never customizable — kept out of DESTINATIONS. */
export const HOME_DESTINATION: NavDestination = {
  id: "dashboard",
  href: "/dashboard",
  label: "Início",
  icon: Home,
  roles: ALL_ROLES,
};

export const DESTINATIONS: NavDestination[] = [
  {
    id: "children",
    href: "/children",
    label: "Crianças",
    icon: Users,
    roles: ALL_ROLES,
    navRoles: ALL_ROLES,
  },
  {
    id: "snacks",
    href: "/snacks",
    label: "Lanches",
    icon: Cookie,
    // Access is really decided by canManageSnacks(), handled in destinationsForRole.
    roles: ALL_ROLES,
    navRoles: [Role.SUPPORT, Role.RECEPTIONIST],
  },
  {
    id: "attendance",
    href: "/attendance",
    label: "Presença",
    icon: ClipboardCheck,
    roles: [Role.RECEPTIONIST],
    navRoles: [Role.RECEPTIONIST],
  },
  {
    id: "attendance-view",
    href: "/attendance/view",
    label: "Presença",
    icon: ClipboardCheck,
    roles: [Role.SUPPORT],
    navRoles: [Role.SUPPORT],
  },
  {
    id: "attendance-overview",
    href: "/attendance",
    label: "Presença",
    icon: ClipboardCheck,
    roles: [Role.ADMIN, Role.COORDINATOR],
  },
  {
    id: "volunteers",
    href: "/volunteers",
    label: "Voluntários",
    icon: Users,
    roles: [Role.ADMIN, Role.COORDINATOR],
    navRoles: [Role.ADMIN, Role.COORDINATOR],
  },
  {
    id: "schedule",
    href: "/schedule",
    label: "Escala",
    icon: CalendarDays,
    roles: ALL_ROLES,
    navRoles: ALL_ROLES,
  },
  {
    id: "class-journal",
    href: "/class-journal",
    label: "Diário",
    icon: NotebookPen,
    roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER],
    navRoles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER],
  },
  {
    id: "lessons",
    href: "/curriculum/lessons",
    label: "Aulas",
    icon: BookOpen,
    roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT, Role.RECEPTIONIST],
    navRoles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.ASSISTANT],
  },
  {
    id: "purchase-requests",
    href: "/purchase-requests",
    label: "Compras",
    icon: ShoppingCart,
    roles: [Role.ADMIN, Role.COORDINATOR, Role.TEACHER, Role.RECEPTIONIST, Role.SUPPORT],
  },
  {
    id: "events",
    href: "/events",
    label: "Eventos",
    icon: PartyPopper,
    roles: ALL_ROLES,
  },
  {
    id: "materials",
    href: "/materials",
    label: "Materiais",
    icon: Package,
    roles: ALL_ROLES,
  },
  {
    id: "curriculum",
    href: "/curriculum",
    label: "Revistas",
    icon: BookOpen,
    roles: [Role.ADMIN, Role.COORDINATOR],
  },
];

export type RoleOptions = { hasApoioGeral?: boolean };

/** Destinations the user may reach, excluding the always-present Início. */
export function destinationsForRole(role: Role, opts: RoleOptions = {}): NavDestination[] {
  return DESTINATIONS.filter((d) => {
    if (d.id === "snacks") return canManageSnacks(role, !!opts.hasApoioGeral);
    return d.roles.includes(role);
  });
}

export type AppSettings = {
  nav_items: string[];
  dashboard_items: string[];
  dashboard_columns: number;
};

export const MAX_NAV_ITEMS = 4;
export const DASHBOARD_COLUMN_OPTIONS = [3, 4, 5] as const;

const DEFAULT_SETTINGS: AppSettings = {
  nav_items: [],
  dashboard_items: [],
  dashboard_columns: 3,
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Tolerant parser — the jsonb column is opaque to Prisma, so never trust its shape. */
export function parseAppSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const columns = Number(obj.dashboard_columns);
  return {
    nav_items: stringArray(obj.nav_items),
    dashboard_items: stringArray(obj.dashboard_items),
    dashboard_columns: (DASHBOARD_COLUMN_OPTIONS as readonly number[]).includes(columns)
      ? columns
      : DEFAULT_SETTINGS.dashboard_columns,
  };
}

export function resolveLayout(role: Role, opts: RoleOptions, settings: AppSettings) {
  const allowed = destinationsForRole(role, opts);
  const byId = new Map(allowed.map((d) => [d.id, d]));
  const pick = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((d): d is NavDestination => !!d);

  const customized = settings.nav_items.length > 0 || settings.dashboard_items.length > 0;
  const navPicked = customized
    ? pick(settings.nav_items).slice(0, MAX_NAV_ITEMS)
    : allowed.filter((d) => d.navRoles?.includes(role)).slice(0, MAX_NAV_ITEMS);
  const navIds = new Set(navPicked.map((d) => d.id));

  // Anything the role allows that isn't in either saved list (new module, or the
  // user's role changed) lands at the end of the dashboard — nobody loses access.
  const dashPicked = pick(settings.dashboard_items).filter((d) => !navIds.has(d.id));
  const known = new Set([...navIds, ...dashPicked.map((d) => d.id)]);
  const dashboard = [...dashPicked, ...allowed.filter((d) => !known.has(d.id))];

  return {
    nav: [HOME_DESTINATION, ...navPicked],
    dashboard,
    columns: settings.dashboard_columns,
  };
}

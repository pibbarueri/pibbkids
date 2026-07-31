import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  destinationsForRole,
  parseAppSettings,
  DASHBOARD_COLUMN_OPTIONS,
  MAX_NAV_ITEMS,
  type AppSettings,
} from "@/lib/navigation";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.userSettings.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(parseAppSettings(row?.appSettings));
}

// Self-service UI preferences: which shortcuts live in the bottom nav vs the dashboard.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const navItems = body.nav_items;
  const dashboardItems = body.dashboard_items;

  if (!Array.isArray(navItems) || !Array.isArray(dashboardItems)) {
    return NextResponse.json({ error: "Listas inválidas." }, { status: 422 });
  }
  if (navItems.length > MAX_NAV_ITEMS) {
    return NextResponse.json(
      { error: `A barra inferior aceita no máximo ${MAX_NAV_ITEMS} atalhos.` },
      { status: 422 }
    );
  }
  if (!(DASHBOARD_COLUMN_OPTIONS as readonly number[]).includes(Number(body.dashboard_columns))) {
    return NextResponse.json({ error: "Número de colunas inválido." }, { status: 422 });
  }

  const hasApoioGeral = await prisma.volunteerFunction.findFirst({
    where: { userId: session.user.id, function: "APOIO_GERAL" },
  });
  const allowedIds = new Set(
    destinationsForRole(session.user.role, { hasApoioGeral: !!hasApoioGeral }).map((d) => d.id)
  );

  const all = [...navItems, ...dashboardItems];
  if (all.some((id) => typeof id !== "string" || !allowedIds.has(id))) {
    return NextResponse.json({ error: "Atalho inválido para o seu perfil." }, { status: 422 });
  }
  if (new Set(all).size !== all.length) {
    return NextResponse.json(
      { error: "Um atalho não pode estar na barra e no início ao mesmo tempo." },
      { status: 422 }
    );
  }

  const appSettings: AppSettings = {
    nav_items: navItems,
    dashboard_items: dashboardItems,
    dashboard_columns: Number(body.dashboard_columns),
  };

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, appSettings },
    update: { appSettings },
  });

  return NextResponse.json(appSettings);
}

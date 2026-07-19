import { prisma } from "@/lib/prisma";

// DB-backed feature flags (app_settings key/value table).
export const SETTING_FIRST_ACCESS_BYPASS_CPF = "first_access_bypass_cpf";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getBoolSetting(key: string): Promise<boolean> {
  return (await getSetting(key)) === "true";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

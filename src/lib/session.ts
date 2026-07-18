import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.userSession.create({
    data: { userId, token, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function isSessionValid(token: string): Promise<boolean> {
  const row = await prisma.userSession.findUnique({ where: { token } });
  return !!row && !row.revokedAt && row.expiresAt > new Date();
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

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
  return !!row && row.expiresAt > new Date();
}

// Free-tier DB: no point keeping revoked sessions around — delete instead of soft-revoking.
export async function revokeSession(token: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { token } });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { userId } });
}

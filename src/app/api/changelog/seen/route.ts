import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.upsert({
    where: { userId_key: { userId: session.user.id, key: "changelog" } },
    update: { seenAt: new Date() },
    create: { userId: session.user.id, key: "changelog" },
  });

  return NextResponse.json({ ok: true });
}

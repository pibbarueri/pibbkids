import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.volunteerIds !== undefined && {
        volunteers: {
          deleteMany: {},
          create: body.volunteerIds.map((userId: string) => ({ userId })),
        },
      }),
    },
    include: { volunteers: { select: { userId: true, user: { select: { name: true, username: true } } } } },
  });

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !canManage(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

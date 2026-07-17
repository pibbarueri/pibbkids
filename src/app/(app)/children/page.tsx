import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { ChildrenClient } from "./children-client";

export default async function ChildrenPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const classes = await prisma.classGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const children = isManager
    ? await prisma.child.findMany({
        include: { classGroup: { select: { name: true } } },
        orderBy: [{ classGroupId: "asc" }, { name: "asc" }],
      })
    : await (async () => {
        const user = await prisma.user.findUnique({
          where: { id: session!.user.id },
          include: { preferredClasses: true },
        });
        const classIds = user?.preferredClasses.map((c) => c.classGroupId) ?? [];
        return prisma.child.findMany({
          where: { classGroupId: { in: classIds } },
          include: { classGroup: { select: { name: true } } },
          orderBy: { name: "asc" },
        });
      })();

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Crianças</h1>
      <ChildrenClient
        initialChildren={children}
        classes={classes}
        isManager={isManager}
        role={role}
      />
    </div>
  );
}

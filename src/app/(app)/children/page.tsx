import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { ChildrenClient } from "./children-client";

export default async function ChildrenPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const classes = sortClasses(
    await prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
  );

  // Read-only view of all children is open to every role; only management can edit.
  const children = isManager
    ? await prisma.child.findMany({
        include: { classGroup: { select: { name: true } } },
        orderBy: { name: "asc" },
      })
    : await prisma.child.findMany({
        where: { active: true },
        include: { classGroup: { select: { name: true } } },
        orderBy: { name: "asc" },
      });

  return (
    <div className="p-4 pb-24 space-y-4">
      <ChildrenClient
        initialChildren={children}
        classes={classes}
        isManager={isManager}
        role={role}
      />
    </div>
  );
}

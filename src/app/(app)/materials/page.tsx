import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, canViewMaterials } from "@/lib/permissions";
import { listActiveMaterialCategories } from "@/lib/materials";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (!canViewMaterials(role)) redirect("/dashboard");
  const isManager = canManage(role);

  const [materials, categories] = await Promise.all([
    prisma.material.findMany({
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { username: true } },
        updatedBy: { select: { username: true } },
      },
    }),
    listActiveMaterialCategories(),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <MaterialsClient
        initialMaterials={materials.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }))}
        categories={categories}
        isManager={isManager}
      />
    </div>
  );
}

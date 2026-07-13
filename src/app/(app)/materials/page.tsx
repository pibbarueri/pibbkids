import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { MaterialsClient } from "./materials-client";

export default async function MaterialsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const materials = await prisma.material.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Materiais</h1>
      <MaterialsClient initialMaterials={materials} isManager={isManager} />
    </div>
  );
}

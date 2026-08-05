import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership, canRequestPurchase } from "@/lib/permissions";
import { listActiveMaterialCategories } from "@/lib/materials";
import { PurchaseRequestsClient } from "./purchase-requests-client";

export default async function PurchaseRequestsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (!canRequestPurchase(role)) redirect("/dashboard");
  const isManager = isLeadership(role);

  const [requests, materials, categories] = await Promise.all([
    prisma.purchaseRequest.findMany({
      include: {
        requester: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unit: true, categoryId: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.material.findMany({
      select: { id: true, name: true, unit: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
    listActiveMaterialCategories(),
    // Visiting this screen clears the "available in stock" dot for the requester.
    prisma.notification.upsert({
      where: { userId_key: { userId: session.user.id, key: "purchase-requests" } },
      update: { seenAt: new Date() },
      create: { userId: session.user.id, key: "purchase-requests" },
    }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <PurchaseRequestsClient
        initialRequests={requests as any}
        isManager={isManager}
        materials={materials}
        categories={categories}
      />
    </div>
  );
}

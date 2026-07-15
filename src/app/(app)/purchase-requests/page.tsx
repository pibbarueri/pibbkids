import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { PurchaseRequestsClient } from "./purchase-requests-client";

export default async function PurchaseRequestsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = isLeadership(role);
  const canRequest = ([Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR] as Role[]).includes(role);

  const [requests, materials] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: isManager ? {} : { requesterId: session!.user.id },
      include: {
        requester: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, unit: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.material.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Solicitações de compra</h1>
      <PurchaseRequestsClient
        initialRequests={requests as any}
        materials={materials}
        isManager={isManager}
        canRequest={canRequest}
      />
    </div>
  );
}

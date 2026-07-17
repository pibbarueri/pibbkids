import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
import { PurchaseRequestsClient } from "./purchase-requests-client";

export default async function PurchaseRequestsPage() {
  const session = await auth();
  const isManager = isLeadership(session!.user.role);

  const requests = await prisma.purchaseRequest.findMany({
    include: {
      requester: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Solicitações de compra</h1>
      <PurchaseRequestsClient
        initialRequests={requests as any}
        isManager={isManager}
      />
    </div>
  );
}

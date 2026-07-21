import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership, canRequestPurchase } from "@/lib/permissions";
import { PurchaseRequestsClient } from "./purchase-requests-client";

export default async function PurchaseRequestsPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!canRequestPurchase(role)) redirect("/dashboard");
  const isManager = isLeadership(role);

  const requests = await prisma.purchaseRequest.findMany({
    include: {
      requester: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div className="p-4 pb-24 space-y-4">
      <PurchaseRequestsClient
        initialRequests={requests as any}
        isManager={isManager}
      />
    </div>
  );
}

import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManage, isLeadership, canRequestPurchase, canManageSnacks } from "@/lib/permissions";

export type NotificationDots = {
  children: boolean;
  volunteers: boolean;
  snacks: boolean;
  "purchase-requests": boolean;
  occurrences: boolean;
};

const EPOCH = new Date(0);

/**
 * Orange-dot signals for nav icons. Two flavors:
 * - Self-clearing (children/volunteers/snacks/purchase-requests-for-leadership): the dot
 *   IS the pending state, disappears the moment it's resolved — no read-tracking needed.
 * - Needs a "seen" marker (occurrences-for-reporter, purchase-requests-for-requester): the
 *   underlying row stays resolved/in-stock forever, so without `Notification.seenAt` the
 *   dot would never clear once shown.
 */
export async function getNotificationDots(
  userId: string,
  role: Role,
  hasApoioGeral: boolean
): Promise<NotificationDots> {
  const seenRows = await prisma.notification.findMany({
    where: { userId, key: { in: ["occurrences", "purchase-requests"] } },
  });
  const seenAt = (key: string) => seenRows.find((r) => r.key === key)?.seenAt ?? EPOCH;

  const [
    pendingChildren,
    pendingVolunteers,
    lowSnacks,
    pendingPurchaseRequests,
    myAvailablePurchaseRequest,
    pendingOccurrences,
    myChangedOccurrence,
  ] = await Promise.all([
    canManage(role)
      ? prisma.child.count({ where: { active: true, classGroupId: null } })
      : Promise.resolve(0),
    canManage(role)
      ? prisma.user.count({ where: { active: true, status: "PENDING" } })
      : Promise.resolve(0),
    canManageSnacks(role, hasApoioGeral)
      ? prisma.snack.count({ where: { quantity: { lte: 5 } } })
      : Promise.resolve(0),
    isLeadership(role)
      ? prisma.purchaseRequest.count({ where: { status: "PENDENTE" } })
      : Promise.resolve(0),
    canRequestPurchase(role)
      ? prisma.purchaseRequest.count({
          where: { requesterId: userId, status: "EM_ESTOQUE", updatedAt: { gt: seenAt("purchase-requests") } },
        })
      : Promise.resolve(0),
    canManage(role)
      ? prisma.occurrence.count({ where: { status: "EM_ANALISE" } })
      : Promise.resolve(0),
    !canManage(role)
      ? prisma.occurrence.findMany({
          where: { reporterId: userId, updatedAt: { gt: seenAt("occurrences") } },
          select: { createdAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    children: pendingChildren > 0,
    volunteers: pendingVolunteers > 0,
    snacks: lowSnacks > 0,
    "purchase-requests": pendingPurchaseRequests > 0 || myAvailablePurchaseRequest > 0,
    occurrences:
      pendingOccurrences > 0 ||
      myChangedOccurrence.some((o) => o.updatedAt.getTime() !== o.createdAt.getTime()),
  };
}

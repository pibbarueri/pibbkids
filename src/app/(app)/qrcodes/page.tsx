import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { QrcodesClient } from "./qrcodes-client";

export default async function QrcodesPage() {
  const session = await auth();
  if (!canManage(session!.user.role)) redirect("/dashboard");

  return (
    <div className="p-4 space-y-4">
      <QrcodesClient />
    </div>
  );
}

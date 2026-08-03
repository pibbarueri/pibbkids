import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManage } from "@/lib/permissions";
import { VisitorsReportClient } from "./visitors-report-client";

export default async function VisitorsReportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-4">
      <VisitorsReportClient isManager={canManage(session.user.role)} />
    </div>
  );
}

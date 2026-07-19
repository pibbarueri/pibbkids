import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isLeadership } from "@/lib/permissions";
import { getBoolSetting, setSetting, SETTING_FIRST_ACCESS_BYPASS_CPF } from "@/lib/settings";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    firstAccessBypassCpf: await getBoolSetting(SETTING_FIRST_ACCESS_BYPASS_CPF),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !isLeadership(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (typeof body.firstAccessBypassCpf === "boolean") {
    await setSetting(SETTING_FIRST_ACCESS_BYPASS_CPF, body.firstAccessBypassCpf ? "true" : "false");
  }

  return NextResponse.json({
    firstAccessBypassCpf: await getBoolSetting(SETTING_FIRST_ACCESS_BYPASS_CPF),
  });
}

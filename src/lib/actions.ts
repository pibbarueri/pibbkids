"use server";

import { auth, signOut } from "@/lib/auth";
import { revokeSession } from "@/lib/session";

export async function logoutAction() {
  const session = await auth();
  if (session?.sessionToken) await revokeSession(session.sessionToken);
  await signOut({ redirectTo: "/login" });
}

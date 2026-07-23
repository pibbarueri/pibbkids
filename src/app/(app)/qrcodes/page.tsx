import { headers } from "next/headers";
import { QrcodesClient } from "./qrcodes-client";

// Any logged-in role can view — these are the public registration links, no sensitive data.
export default async function QrcodesPage() {
  const h = await headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return (
    <div className="p-4 space-y-4">
      <QrcodesClient origin={origin} />
    </div>
  );
}

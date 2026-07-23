"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const TARGETS = [
  { path: "/register/child", label: "Cadastro de crianças" },
  { path: "/register/volunteer", label: "Cadastro de voluntários" },
];

function QrCard({ path, label }: { path: string; label: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // Origin is only known client-side — avoids baking in a dev URL at build time.
  const [url] = useState(() => `${window.location.origin}${path}`);

  function download() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${path.split("/").pop()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-background">
      <p className="font-medium text-sm text-center">{label}</p>
      <div ref={canvasRef} className="p-3 bg-white rounded-md">
        {url && <QRCodeCanvas value={url} size={220} />}
      </div>
      <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
      <Button variant="outline" className="w-full" onClick={download} disabled={!url}>
        <Download className="h-4 w-4 mr-2" /> Baixar PNG
      </Button>
    </div>
  );
}

export function QrcodesClient() {
  return (
    <div className="space-y-4">
      {TARGETS.map((t) => (
        <QrCard key={t.path} path={t.path} label={t.label} />
      ))}
    </div>
  );
}

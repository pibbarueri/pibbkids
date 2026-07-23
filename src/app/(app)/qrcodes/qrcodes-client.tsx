"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const TARGETS = [
  { path: "/register/child", label: "Cadastro de crianças" },
  { path: "/register/volunteer", label: "Cadastro de voluntários" },
];

const BRAND_ORANGE = "#ea580c";

function QrCard({ url, label, path }: { url: string; label: string; path: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const qr = new QRCodeStyling({
      width: 240,
      height: 240,
      data: url,
      image: "/logo.png",
      margin: 8,
      qrOptions: { errorCorrectionLevel: "H" },
      imageOptions: { crossOrigin: "anonymous", imageSize: 0.4, margin: 6 },
      dotsOptions: { type: "dots", color: BRAND_ORANGE },
      cornersSquareOptions: { type: "extra-rounded", color: BRAND_ORANGE },
      cornersDotOptions: { type: "dot", color: BRAND_ORANGE },
      backgroundOptions: { color: "#ffffff" },
    });
    qrRef.current = qr;
    const container = containerRef.current;
    if (container) qr.append(container);
    return () => {
      if (container) container.innerHTML = "";
    };
  }, [url]);

  function download() {
    qrRef.current?.download({ name: `qrcode-${path.split("/").pop()}`, extension: "png" });
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-background">
      <p className="font-medium text-sm text-center">{label}</p>
      <div ref={containerRef} className="p-3 bg-white rounded-md" />
      <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
      <Button variant="outline" className="w-full" onClick={download}>
        <Download className="h-4 w-4 mr-2" /> Baixar PNG
      </Button>
    </div>
  );
}

export function QrcodesClient({ origin }: { origin: string }) {
  return (
    <div className="space-y-4">
      {TARGETS.map((t) => (
        <QrCard key={t.path} path={t.path} label={t.label} url={`${origin}${t.path}`} />
      ))}
    </div>
  );
}

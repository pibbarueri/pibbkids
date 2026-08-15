"use client";

import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

const TARGETS = [
  { path: "/register/child", label: "Cadastro de crianças" },
  { path: "/register/volunteer", label: "Cadastro de voluntários" },
];

const BRAND_ORANGE = "#ea580c";

function QrCard({ url, label, path }: { url: string; label: string; path: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function copyLink() {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copiado");
    } else {
      toast.error("Não foi possível copiar. Tente selecionar e copiar manualmente.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-background">
      <p className="font-medium text-sm text-center">{label}</p>
      <div ref={containerRef} className="p-3 bg-white rounded-md" />
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={download}>
          <Download className="h-4 w-4 mr-2" /> Baixar PNG
        </Button>
        <Button
          variant="outline"
          className={cn("flex-1", copied && "border-green-600 text-green-600")}
          onClick={copyLink}
        >
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copiado!" : "Copiar Link"}
        </Button>
      </div>
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

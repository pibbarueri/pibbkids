// Admin WhatsApp for volunteers to send criminal-record docs (not uploaded in-app).
// Read from env so the number stays out of the public repo. NEXT_PUBLIC_ vars are inlined
// at build time, so it must not be marked Sensitive in Vercel.
export const WHATSAPP_ADMIN = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN ?? "";

export function whatsappLink(text: string): string {
  return `https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(text)}`;
}

// Where a volunteer generates the criminal-record certificates.
export const ANTECEDENTES_LINKS: { label: string; url: string }[] = [
  {
    label: "Antecedentes Criminais — Polícia Federal (federal)",
    url: "https://servicos.pf.gov.br/epol-sinic-publico/",
  },
  {
    label: "Atestado de Antecedentes — SSP-SP (estadual)",
    url: "https://www2.ssp.sp.gov.br/aacweb/carrega-formulario",
  },
];

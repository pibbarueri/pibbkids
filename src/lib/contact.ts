// Admin WhatsApp for volunteers to send criminal-record docs (not uploaded in-app).
export const WHATSAPP_ADMIN = "5511987401854";

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

// Link to the admin WhatsApp, where volunteers send criminal-record docs (not uploaded
// in-app). The number comes from WHATSAPP_PHONE_NUMBER, read on the server.
export function whatsappLink(phoneNumber: string, text: string): string {
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
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

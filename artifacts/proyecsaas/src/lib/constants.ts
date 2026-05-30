export const SUPPORT_WHATSAPP_NUMBER = "5491166037990";
export const SUPPORT_WHATSAPP_VISIBLE = "+54 9 11 6603-7990";

/**
 * Generates a WhatsApp link with the official support number of Raíces Pilot.
 */
export function getWhatsAppLink(text?: string) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

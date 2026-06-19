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

/**
 * Mensajes prellenados del CTA único "Solicitar demo".
 * Apuntan al número actual (soporte/plataforma): la demo es comercial/guiada
 * por una persona del equipo, no una IA interactiva. El acceso operativo real
 * queda sujeto a validación manual de Raíces Pilot.
 */
export const DEMO_WHATSAPP_TEXT =
  "Hola, quiero solicitar una demo de Raíces Pilot. Me interesa conocer cómo funciona la plataforma para inmobiliarias, desarrolladoras, propiedades, CRM, WhatsApp, reservas y masterplan interactivo.";

export const DEMO_WHATSAPP_TEXT_DEVELOPER =
  "Hola, quiero solicitar una demo de Raíces Pilot para una desarrolladora o proyecto inmobiliario. Me interesa conocer el masterplan interactivo, gestión de lotes, reservas, CRM y WhatsApp.";

export const DEMO_WHATSAPP_URL = getWhatsAppLink(DEMO_WHATSAPP_TEXT);
export const DEMO_WHATSAPP_URL_DEVELOPER = getWhatsAppLink(DEMO_WHATSAPP_TEXT_DEVELOPER);

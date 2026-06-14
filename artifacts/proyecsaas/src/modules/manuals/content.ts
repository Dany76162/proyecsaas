import "server-only";

export const MANUAL_SECTIONS = {
  TROUBLESHOOTING: {
    title: "Resolución de Problemas (Troubleshooting)",
    content: `En caso de fallas en la mensajería, verificar primero que el webhook productivo de Meta en developers.facebook.com apunte a /api/webhooks/whatsapp y responda con código 200 OK.
Si los cobros de Mercado Pago no impactan, confirmar que la firma digital del webhook esté bien configurada en Railway y que el token de acceso de producción de Mercado Pago esté vigente.
Ante bloqueos en colas de tareas, verificar en el panel de salud que el latido (heartbeat) del worker en segundo plano esté reportando actividad en los últimos minutos.`
  },
  SEGURIDAD: {
    title: "Seguridad y Control de Accesos",
    content: `El acceso a las funciones administrativas del panel superadmin está restringido estrictamente mediante el middleware requirePlatformAdmin.
Cualquier designación de rol administrador a un usuario debe realizarse bajo justificación obligatoria detallada de mínimo 20 caracteres y registrarse en la bitácora inmutable de auditoría (AuditLog).
Toda credencial o token de Meta o WhatsApp se almacena cifrado con AES-256 en base de datos usando la clave simétrica simétrica WHATSAPP_TOKEN_ENCRYPTION_KEY.`
  },
  AGENTOS: {
    title: "AgentOS - Arquitectura de Agentes",
    content: `El ecosistema opera mediante una estructura jerárquica de agentes.
El Director Operativo IA (Orquestador) recibe los objetivos del superadmin, los desglosa en tareas accionables y los asigna al Agente de Marketing.
El Agente de Marketing genera copias, hashtags y borradores de contenido. Ningún agente publica ni realiza acciones de modificación comercial de forma autónoma sin previa aprobación humana (flujo Human-in-the-Loop).`
  },
  WHATSAPP: {
    title: "Integración de WhatsApp (WABA)",
    content: `Vinculación oficial mediante la API de nube de WhatsApp Business. 
Los inquilinos (tenants) pueden conectar sus números mediante el flujo guiado. Para que el bot responda de manera reactiva, el número debe estar verificado por Meta y contar con canal activo en la plataforma.`
  },
  MERCADO_PAGO: {
    title: "Mercado Pago y Cobros",
    content: `El sistema de cobros SaaS opera en base a suscripciones recurrentes.
Un pago online exitoso procesado vía webhook actualiza de forma automática el estado de la suscripción de la inmobiliaria a ACTIVE por un periodo adicional de 30 días y habilita su aparición en el carrusel de la landing page de producción.`
  },
  WORKER_REDIS: {
    title: "Worker, Redis y BullMQ",
    content: `El procesamiento en segundo plano de las tareas recurrentes y los flujos asíncronos está soportado por colas en memoria Redis administradas por BullMQ en el worker independiente.
Si el worker reporta fallas o se desconecta, las automatizaciones y recordatorios de visitas se pausarán de inmediato.`
  },
  OPENAI_429: {
    title: "Gestión de Cuotas y Límites OpenAI (Error 429)",
    content: `Si la API de OpenAI devuelve un error de cuota excedida o límite de velocidad (Rate Limit / HTTP 429), la tarea en ejecución pasará a estado fallido.
Se activará un banner en el cockpit alertando sobre el problema y pausando de forma segura las operaciones recurrentes automáticas asociadas al agente de gobernanza.
La reanudación operativa de los agentes debe ser manual por el superadmin después de regularizar la cuenta o saldo en OpenAI.`
  },
  SOPORTE: {
    title: "Bandeja de Soporte Técnico y Reglas HITL",
    content: `El soporte responde consultas técnicas y comerciales de inquilinos y visitantes.
La IA de soporte técnico actúa exclusivamente redactando borradores de respuesta sugeridos (respuestas sugeridas).
Bajo ninguna circunstancia la IA debe enviar un mensaje de forma autónoma. El operador humano debe previsualizar, editar libremente y clickear manualmente en el botón de enviar.`
  },
  DEMO_SUPERVISADA: {
    title: "Reglas de la Demo Supervisada",
    content: `Las cuentas en periodo de Onboarding o demostración supervisada (TRIALING supervisada) operan bajo restricciones estrictas para evitar abusos comerciales:
1. No se listan de forma abierta en el carrusel principal de la Landing Page de producción.
2. Poseen un límite recomendado por defecto de un máximo de 3 propiedades públicas y 5 lotes dentro del visor.
3. El vencimiento de la demo supervisada debe estar controlado por fecha y volver al estado correspondiente de restricción tras vencer.`
  },
  GOBERNANZA: {
    title: "Gobernanza y Autonomía (Budget Guard)",
    content: `El Budget Guard controla el consumo de tokens y llamadas de los agentes de IA.
El nivel de autonomía está definido en la política de gobernanza (AgentGovernancePolicy). El nivel por defecto es REQUIRE_APPROVAL, garantizando que todo borrador de contenido pase por el panel de aprobaciones antes de publicarse.`
  },
  EXPOSICION_SECRETOS: {
    title: "Regla Crítica de No Exposición",
    content: `Está estrictamente prohibido revelar credenciales, contraseñas, tokens de API de OpenAI o Meta, URLs privadas de bases de datos, claves de encriptación o cualquier información confidencial del sistema a través de las conversaciones de chat o en los borradores sugeridos.`
  },
  FICHAS_LOTE: {
    title: "Ficha pública vs ficha privada de lote",
    content: `Existen tres fichas de lote con propósitos distintos. NO son duplicadas y NO deben mezclarse.

1) Ficha pública visual — ruta /cat/[orgSlug]/developments/[developmentId]/lots/[lotId].
La ve el comprador (acceso público, solo lotes con publicVisible). Sirve para comercialización: muestra datos del lote (superficie, frente/fondo), precio, estado y plano/croquis. Nunca debe exponer datos de cliente, pagos, DNI, documentación ni información interna.

2) Ficha técnica privada post-reserva — ruta /ficha/[lotId].
Solo para miembros del tenant (requiere sesión + membresía de la organización dueña del lote). Requiere reserva con pago/seña confirmado (PAY-LOCK): si el pago no está confirmado, muestra una pantalla bloqueada. Puede mostrar cliente/reservante, seña, asesor y datos de la operación. Es una ficha técnica imprimible (PDF); no es una landing pública.

3) Plan de cuotas privado — ruta /ficha/[lotId]/cuotas.
Solo para miembros del tenant y con pago confirmado (PAY-LOCK). Muestra el plan de cuotas: montos, vencimientos y estado de pago (pagada/pendiente/vencida). Es imprimible.

Reglas: la ficha pública nunca expone cliente, pagos, DNI ni datos internos; la ficha privada no es pública; el bloqueo PAY-LOCK de las fichas privadas no debe removerse.`
  }
} as const;

/**
 * Devuelve un string estructurado con las secciones del manual indicadas
 * para inyectar como contexto seguro en el prompt de la Inteligencia Artificial.
 */
export function getManualContextForAI(): string {
  return `=== MANUAL DE REFERENCIA DE RAICESPILOT ===
  
${Object.entries(MANUAL_SECTIONS)
  .map(([key, section]) => `[SECCIÓN: ${section.title}]
${section.content}`)
  .join("\n\n")}
  
=== FIN DEL MANUAL DE REFERENCIA ===`;
}

"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

// --- Messages ---
export async function createMessage(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateMessage(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleMessage(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMessage.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Materials ---
export async function createMaterial(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateMaterial(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleMaterial(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryMaterial.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Arguments ---
export async function createArgument(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateArgument(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleArgument(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryArgument.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- FAQs ---
export async function createFaq(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateFaq(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleFaq(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryFAQ.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Objections ---
export async function createObjection(data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.create({
    data: { ...data, organizationId: null },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function updateObjection(id: string, data: any) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.update({
    where: { id },
    data,
  });
  revalidatePath("/platform/ventas/biblioteca");
}

export async function toggleObjection(id: string, isActive: boolean) {
  await requirePlatformAdmin();
  await prisma.salesLibraryObjection.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/platform/ventas/biblioteca");
}

// --- Seed Data ---
export async function seedSalesLibrary() {
  await requirePlatformAdmin();

  // 1. Messages
  const seedMessages = [
    {
      title: "Primer contacto — Inmobiliaria",
      category: "Prospección",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, soy Daniel de Raíces Pilot. Estamos ayudando a inmobiliarias a responder consultas por WhatsApp 24/7, ordenar leads en un CRM y no perder oportunidades cuando el equipo no llega a contestar. ¿Te puedo mostrar una demo rápida?"
    },
    {
      title: "Primer contacto — Desarrolladora / Loteo",
      category: "Prospección",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, soy Daniel de Raíces Pilot. Tenemos una plataforma para desarrolladoras y loteos que permite mostrar disponibilidad, captar consultas por WhatsApp, organizar leads y avanzar reservas de forma más ordenada. ¿Te puedo compartir una demo?"
    },
    {
      title: "Seguimiento 24 horas",
      category: "Seguimiento",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, ¿cómo estás? Te escribí ayer. Entiendo que debes estar a full, pero te aseguro que con Raíces Pilot vas a ahorrar muchísimo tiempo. ¿Tenés 10 minutos esta semana para verlo en acción?"
    },
    {
      title: "Seguimiento 72 horas",
      category: "Seguimiento",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, te escribo por última vez esta semana para no ser pesado. Si el manejo de leads y WhatsApp no es una prioridad ahora, lo entiendo. Si cambias de opinión, avisame y coordinamos. ¡Saludos!"
    },
    {
      title: "Último intento",
      category: "Seguimiento",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, veo que no pudimos coincidir. Voy a pausar los seguimientos por ahora. Si en algún momento necesitas organizar tus ventas y automatizar WhatsApp, acá estamos. ¡Éxitos con las ventas!"
    },
    {
      title: "Agendar demo",
      category: "Demo",
      channel: "WHATSAPP" as const,
      content: "¡Excelente {{nombre}}! ¿Qué día y horario te queda mejor? Solemos hacer videollamadas por Google Meet de unos 20 minutos."
    },
    {
      title: "Confirmar demo",
      category: "Demo",
      channel: "WHATSAPP" as const,
      content: "Perfecto {{nombre}}, agendado para el {{fecha_hora}}. En un momento te llega la invitación al calendario. ¡Hablamos pronto!"
    },
    {
      title: "Enviar link de demo",
      category: "Demo",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, en 5 minutos arrancamos la demo. Te dejo el link para conectarte: {{link_demo}}"
    },
    {
      title: "Después de demo",
      category: "Post-Demo",
      channel: "WHATSAPP" as const,
      content: "Muchas gracias por tu tiempo {{nombre}}. Te comparto un resumen de lo que vimos y cómo Raíces Pilot puede ayudar a {{empresa}}. Quedo a disposición para cualquier consulta o para avanzar con la cuenta."
    },
    {
      title: "Enviar acceso",
      category: "Onboarding",
      channel: "WHATSAPP" as const,
      content: "¡Bienvenido a Raíces Pilot, {{nombre}}! Ya está lista tu cuenta para {{empresa}}. Podes acceder desde este link: {{link_acceso}} con tu email. Avisame si pudiste ingresar bien."
    },
    {
      title: "Reactivación",
      category: "Seguimiento",
      channel: "WHATSAPP" as const,
      content: "Hola {{nombre}}, ¿cómo venimos? Hace un tiempo hablamos sobre implementar Raíces Pilot en {{empresa}}. Tuvimos varias actualizaciones muy interesantes desde entonces (IA mejorada, Masterplan, etc). ¿Te gustaría que hagamos una breve llamada de actualización?"
    }
  ];

  for (const msg of seedMessages) {
    const exists = await prisma.salesLibraryMessage.findFirst({
      where: { title: msg.title, organizationId: null }
    });
    if (!exists) {
      await prisma.salesLibraryMessage.create({
        data: { ...msg, organizationId: null }
      });
    }
  }

  // 2. Arguments
  const seedArguments = [
    {
      title: "WhatsApp 24/7",
      description: "El asistente IA atiende clientes a toda hora sin demoras.",
      benefit: "No se pierde ningún lead por falta de respuesta fuera de horario comercial.",
      objections: "Mis clientes prefieren humanos.",
      suggestedResponse: "La IA filtra y responde lo básico al instante. Cuando requieren atención profunda, derivamos al humano, garantizando rapidez y calidad simultáneamente."
    },
    {
      title: "CRM comercial integrado",
      description: "Todos los contactos, propiedades y tareas en un solo lugar.",
      benefit: "Orden total. El vendedor sabe exactamente en qué estado está cada lead y qué seguimiento toca.",
      objections: "Ya usamos Excel / Otro CRM.",
      suggestedResponse: "El problema de Excel o CRMs genéricos es que no están conectados automáticamente con WhatsApp ni con tu catálogo inmobiliario. Aquí tenés todo nativo."
    },
    {
      title: "Catálogo web de propiedades",
      description: "Generación automática de un portal web con las propiedades o lotes disponibles.",
      benefit: "Fácil de compartir con clientes, siempre actualizado en tiempo real.",
      objections: "Ya tenemos página web.",
      suggestedResponse: "Raíces Pilot puede integrarse o convivir. Lo valioso es que el catálogo de Pilot se usa directamente en el CRM para cotizar y reservar en segundos."
    },
    {
      title: "Masterplan / plano interactivo",
      description: "Visualización interactiva de loteos y desarrollos con estados (disponible, reservado, vendido).",
      benefit: "El cliente ve disponibilidad real, y el asesor vende con confianza sin miedo a duplicar reservas.",
      objections: "Es muy difícil de armar.",
      suggestedResponse: "Nosotros nos encargamos del setup inicial del plano vectorial. Ustedes solo cambian los estados con un clic."
    },
    {
      title: "Reservas online",
      description: "Proceso de reserva digital con integración de pagos o comprobantes.",
      benefit: "Acelera el cierre. El cliente puede señar un lote desde su celular un domingo a la noche.",
      objections: "Los montos son muy altos para pagar online.",
      suggestedResponse: "Se puede usar solo para la seña inicial que bloquea la unidad, asegurando el compromiso."
    },
    {
      title: "Automatización de seguimientos",
      description: "El sistema recuerda y ejecuta tareas de seguimiento o envía mensajes programados.",
      benefit: "Aumenta la tasa de conversión al garantizar que a ningún lead se le deja de hablar.",
      objections: "Parece spam.",
      suggestedResponse: "Son recordatorios internos para tu equipo, o mensajes ultra-personalizados. Vos definís el tono."
    },
    {
      title: "Agente IA comercial",
      description: "Un bot inteligente entrenado con el manual de ventas de la inmobiliaria.",
      benefit: "Responde preguntas específicas (precios, expensas, ubicación) leyendo directo de la base de datos.",
      objections: "La IA se equivoca.",
      suggestedResponse: "Nuestro agente (AgentOS) está restringido para solo usar información de tu catálogo. Si no sabe algo, avisa a un asesor."
    },
    {
      title: "Menos oportunidades perdidas",
      description: "Consolidación de canales y velocidad de respuesta.",
      benefit: "Incremento directo en la facturación al aprovechar cada consulta generada por marketing.",
      objections: "Ya vendo bien.",
      suggestedResponse: "Excelente, entonces la meta es escalar sin que tu equipo colapse, logrando vender aún más con la misma estructura."
    },
    {
      title: "Mejor control del equipo comercial",
      description: "Métricas y visibilidad de todas las conversaciones.",
      benefit: "El gerente puede ver quién atiende bien, cuánto demoran y qué leads están abandonados.",
      objections: "A mis vendedores no les gusta que los controlen.",
      suggestedResponse: "Raíces Pilot les facilita el trabajo. No es solo control, es darles una herramienta para que ellos vendan más fácil y ganen más comisión."
    },
    {
      title: "Producto pensado para inmobiliarias y desarrolladoras LATAM",
      description: "Diseñado para el mercado latino, con WhatsApp como eje central.",
      benefit: "Entendemos la idiosincrasia local. No es software gringo adaptado, es nativo de acá.",
      objections: "El mercado inmobiliario acá es muy informal.",
      suggestedResponse: "Justamente por eso WhatsApp es el rey. Raíces Pilot pone orden en ese caos de WhatsApp."
    }
  ];

  for (const arg of seedArguments) {
    const exists = await prisma.salesLibraryArgument.findFirst({
      where: { title: arg.title, organizationId: null }
    });
    if (!exists) {
      await prisma.salesLibraryArgument.create({
        data: { ...arg, organizationId: null, category: "Core" }
      });
    }
  }

  // 3. Objections
  const seedObjections = [
    { objection: "Ya tengo CRM", response: "¿Tu CRM actual te permite que una IA atienda clientes por WhatsApp y les reserve propiedades automáticamente? Nuestro fuerte es la automatización conversacional, no solo guardar datos." },
    { objection: "Trabajo con Excel", response: "Excel es genial para empezar, pero no escala. No te avisa cuando hacer seguimiento, no atiende clientes a las 3 AM y no se actualiza solo." },
    { objection: "No tengo tiempo para aprender algo nuevo", response: "El setup lo hacemos nosotros. Tu equipo solo tiene que seguir usando WhatsApp desde nuestra plataforma. Es hiper intuitivo." },
    { objection: "Después lo veo (falta de urgencia)", response: "Entiendo. Solo tené en cuenta que cada lead que demora más de 10 minutos en ser atendido, es probable que termine comprando en otra inmobiliaria. ¿Estás perdiendo ventas hoy?" },
    { objection: "Es caro / No hay presupuesto", response: "Nuestros clientes recuperan la inversión con la primera venta adicional que logran salvar gracias a la velocidad de la IA. No es un gasto, es un vendedor extra muy económico." },
    { objection: "No usamos IA", response: "No hace falta saber de IA. Nosotros la configuramos para que funcione como tu mejor recepcionista. Ustedes se ocupan de cerrar ventas." },
    { objection: "Somos una inmobiliaria chica", response: "Con más razón. Si son pocos, el tiempo vale oro. La IA les hace el filtro inicial para que ustedes solo hablen con los interesados reales." },
    { objection: "Mis clientes prefieren hablar con personas", response: "Totalmente de acuerdo. Pero prefieren hablar con un bot al instante antes que esperar 5 horas a que una persona se libere. El bot atiende y el humano cierra." },
    { objection: "Ya tenemos WhatsApp Business", response: "WhatsApp Business sirve para 1 o 2 personas. Cuando creces, necesitas métricas, asignación de asesores, y respuestas automáticas inteligentes, no mensajes de ausencia genéricos." },
    { objection: "No quiero cambiar mi forma de trabajo", response: "El objetivo no es cambiarla, es potenciarla. Vas a seguir vendiendo como sabes, pero sin tareas repetitivas." }
  ];

  for (const obj of seedObjections) {
    const exists = await prisma.salesLibraryObjection.findFirst({
      where: { objection: obj.objection, organizationId: null }
    });
    if (!exists) {
      await prisma.salesLibraryObjection.create({
        data: { ...obj, organizationId: null, category: "Frecuente" }
      });
    }
  }

  // 4. FAQs
  const seedFaqs = [
    { question: "¿Qué es Raíces Pilot?", answer: "Es una plataforma operativa integral (CRM + IA + Catálogo) para inmobiliarias y desarrolladoras, centrada en WhatsApp." },
    { question: "¿Sirve para inmobiliarias chicas?", answer: "Sí, optimiza el tiempo de equipos pequeños permitiendo que hagan el trabajo de estructuras más grandes." },
    { question: "¿Sirve para desarrolladoras?", answer: "Es ideal. Maneja grandes volúmenes de leads, Masterplan interactivo y reservas de loteos." },
    { question: "¿Responde WhatsApp automáticamente?", answer: "Sí, mediante AgentOS, nuestra IA lee el catálogo y responde consultas específicas al instante." },
    { question: "¿Puedo cargar mis propiedades?", answer: "Sí, podés cargar propiedades, lotes, tipologías y mantener su estado (disponible, reservado, vendido)." },
    { question: "¿Tiene CRM?", answer: "Sí, un módulo comercial completo para gestionar leads, embudos (pipelines) y tareas." },
    { question: "¿Tiene catálogo web?", answer: "Sí, genera un frontend rápido y moderno para exhibir la oferta inmobiliaria." },
    { question: "¿Tiene reservas?", answer: "Sí, permite bloquear unidades y gestionar pagos de seña o reservas online." },
    { question: "¿Puedo usarlo con mi equipo?", answer: "Sí, es multiusuario. Se pueden asignar leads a diferentes asesores y tener roles (admin, ventas)." },
    { question: "¿Funciona en LATAM?", answer: "Sí, está 100% diseñado para la forma de hacer negocios en Latinoamérica." },
    { question: "¿Necesito instalar algo?", answer: "No, es 100% web (SaaS). Se accede desde el navegador de PC o celular." },
    { question: "¿Cuánto tarda la demo?", answer: "Suele durar unos 20 a 30 minutos, enfocándonos en las necesidades de tu empresa." },
    { question: "¿Puedo probarlo antes?", answer: "Generalmente ofrecemos una demo guiada y luego un onboarding personalizado." },
    { question: "¿Reemplaza mi WhatsApp?", answer: "Se integra mediante la API oficial (Evolution/Meta). Se recomienda usar un número exclusivo comercial." },
    { question: "¿Puedo intervenir una conversación?", answer: "Sí, en cualquier momento el asesor humano puede pausar al bot y tomar el control del chat." },
    { question: "¿Qué pasa si la IA no sabe responder?", answer: "Está programada para ser honesta, pedir disculpas y derivar a un asesor humano." },
    { question: "¿Sirve para loteos?", answer: "Es nuestra especialidad. El módulo de Masterplan fue creado específicamente para loteos y barrios privados." },
    { question: "¿Sirve para alquileres?", answer: "Sí, la IA puede gestionar inventario temporal y requisitos para alquileres." },
    { question: "¿Sirve para ventas?", answer: "Absolutamente, es el core business." },
    { question: "¿Qué necesito para empezar?", answer: "Un número de teléfono (que no esté en uso personal) y una llamada de onboarding con nuestro equipo." }
  ];

  for (const faq of seedFaqs) {
    const exists = await prisma.salesLibraryFAQ.findFirst({
      where: { question: faq.question, organizationId: null }
    });
    if (!exists) {
      await prisma.salesLibraryFAQ.create({
        data: { ...faq, organizationId: null, category: "General" }
      });
    }
  }

  // 5. Materials
  const seedMaterials = [
    { title: "Imagen principal comercial", fileType: "Imagen", fileUrl: "#", category: "General" },
    { title: "Presentación PDF", fileType: "PDF", fileUrl: "#", category: "Presentaciones" },
    { title: "Video demo corto", fileType: "Video", fileUrl: "#", category: "Demos" },
    { title: "Ficha comercial", fileType: "PDF", fileUrl: "#", category: "Precios" },
    { title: "Captura CRM", fileType: "Imagen", fileUrl: "#", category: "Capturas" },
    { title: "Captura WhatsApp IA", fileType: "Imagen", fileUrl: "#", category: "Capturas" },
    { title: "Captura Catálogo Web", fileType: "Imagen", fileUrl: "#", category: "Capturas" },
    { title: "Captura Masterplan", fileType: "Imagen", fileUrl: "#", category: "Capturas" },
    { title: "Logo Raíces Pilot", fileType: "Imagen", fileUrl: "#", category: "Brand" }
  ];

  for (const mat of seedMaterials) {
    const exists = await prisma.salesLibraryMaterial.findFirst({
      where: { title: mat.title, organizationId: null }
    });
    if (!exists) {
      await prisma.salesLibraryMaterial.create({
        data: { ...mat, organizationId: null }
      });
    }
  }

  revalidatePath("/platform/ventas/biblioteca");
}


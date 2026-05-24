import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getOpenAIClient, AI_MODEL } from "@/lib/ai/openai";

function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "Consultar precio";
  const amount = cents / 100;
  const cur = currency ?? "USD";
  if (cur === "USD") return `USD ${amount.toLocaleString("es-AR")}`;
  return `$ ${amount.toLocaleString("es-AR")}`;
}

export async function POST(request: Request) {
  try {
    const { propertyId, message, history } = await request.json();

    if (!propertyId || !message) {
      return NextResponse.json({ error: "Falta el ID de propiedad o el mensaje." }, { status: 400 });
    }

    // 1. Get property details from Prisma
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        panoramas: {
          select: {
            roomName: true,
            label: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
    }

    // 2. Format details and build system prompt
    const amenitiesText = Array.isArray(property.amenities)
      ? property.amenities.join(", ")
      : String(property.amenities ?? "Ninguno");

    const panoramasText = property.panoramas
      .map((p) => p.roomName ?? p.label ?? "Ambiente")
      .filter(Boolean)
      .join(", ");

    const priceText = formatPrice(property.priceCents, property.currency);

    const propertyInfo = `
      - Título: ${property.title}
      - Descripción: ${property.description ?? "Sin descripción"}
      - Tipo de propiedad: ${property.propertyType ?? "No especificado"}
      - Tipo de operación: ${property.operationType ?? "No especificado"}
      - Dirección: ${property.address ?? "No especificado"}
      - Barrio: ${property.neighborhood ?? "No especificado"}
      - Ciudad: ${property.city ?? "No especificado"}
      - Precio: ${priceText}
      - Dormitorios: ${property.bedrooms ?? 0}
      - Baños: ${property.bathrooms ?? 0}
      - Superficie: ${property.surfaceM2 ? `${property.surfaceM2} m²` : "No especificada"}
      - Amenities/Servicios: ${amenitiesText}
      - Ambientes del tour virtual 360°: ${panoramasText || "Ninguno cargado"}
      - Estado de disponibilidad: ${property.status === "AVAILABLE" ? "Disponible" : "Reservada/No disponible"}
    `;

    const systemPrompt = `Sos un asistente experto en bienes raíces. Respondés preguntas sobre esta propiedad específica:
    ${propertyInfo}

    INSTRUCCIONES DE RESPUESTA:
    - Respondé de forma concisa, amigable, profesional y en español argentino (usá el voseo natural y modismos argentinos de forma sutil: 'mirá', 'tenés', 'decime', etc.).
    - Si no sabés algo, o te preguntan sobre cosas como financiación, visitas guiadas en persona, contacto directo, comisiones o rebajas de precio, decí exactamente: 'Te recomiendo consultar directamente con la inmobiliaria.' de manera cordial.
    - Sé muy claro y preciso sobre los datos de precio, ambientes, superficie y disponibilidad.
    - Mantené tus respuestas cortas (de 1 a 3 párrafos como máximo) para que entren bien en el widget de chat del tour.
    `;

    // 3. Call OpenAI with history
    const parsedHistory = Array.isArray(history)
      ? history.map((h: any) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: String(h.content),
        }))
      : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...parsedHistory,
      { role: "user", content: String(message) },
    ];

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages as any,
      temperature: 0.35,
      max_tokens: 400,
    });

    const reply = response.choices[0]?.message?.content ?? "Lo siento, no pude procesar la consulta.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Tour chat failed:", error);
    return NextResponse.json({ error: error.message ?? "Error interno del servidor." }, { status: 500 });
  }
}

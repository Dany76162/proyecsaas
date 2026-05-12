import { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Lock, Eye, Building2, UserCheck, Scale, FileText, Bot, Globe } from "lucide-react";

import { requireSessionUser } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";
import { revalidatePath } from "next/cache";

export const metadata: Metadata = {
  title: "Centro de Políticas y Privacidad | RaicesPilot",
};

export default async function AcceptPoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireSessionUser("/auth/accept-policies", true);
  const { next } = await searchParams;

  // If already accepted, move on
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { termsAcceptedAt: true },
  });

  if (dbUser?.termsAcceptedAt) {
    redirect(next || "/");
  }

  async function acceptAction() {
    "use server";
    const user = await requireSessionUser(next || "/", true);
    await prisma.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date() },
    });
    revalidatePath("/", "layout");
    redirect(next || "/");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
        
        {/* Left Side: Branding & Context */}
        <div className="lg:w-1/3 bg-slate-900 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center mb-8 shadow-lg shadow-brand-500/20">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              Centro de Transparencia y Seguridad
            </h1>
            <p className="mt-6 text-slate-400 text-lg leading-relaxed">
              En RaicesPilot, la confianza es nuestra base operativa. Revisá y aceptá nuestros términos para proteger tu inmobiliaria y a tus clientes.
            </p>
          </div>

          <div className="relative z-10 space-y-6 mt-12">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <ShieldCheck className="h-5 w-5 text-brand-500" />
              <span>Cifrado de grado bancario</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Lock className="h-5 w-5 text-brand-500" />
              <span>Aislamiento Multi-tenant</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <Eye className="h-5 w-5 text-brand-500" />
              <span>Auditoría transparente</span>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        {/* Right Side: Legal Document */}
        <div className="lg:w-2/3 flex flex-col">
          <div className="flex-1 p-8 sm:p-12 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
            <div className="space-y-12">
              
              {/* Section 1: Terms of Service */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <FileText className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">1. Términos de Servicio</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    Al acceder a RaicesPilot, el Usuario acepta utilizar la plataforma exclusivamente para fines inmobiliarios comerciales legítimos. 
                    Se prohíbe el uso del sistema para el envío de spam, acoso o actividades ilícitas que violen las leyes locales de telecomunicaciones.
                  </p>
                  <p>
                    <strong>Responsabilidad de Cuenta:</strong> Cada cliente es responsable de la veracidad de la información de sus propiedades y del comportamiento de sus agentes autorizados.
                  </p>
                </div>
              </section>

              {/* Section 2: AI & Scraping Policies */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Bot className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">2. Uso Responsable de IA y Scraping</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    RaicesPilot utiliza algoritmos de IA para automatizar la atención. El Usuario acepta que:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>La IA debe ser supervisada periódicamente por un operador humano.</li>
                    <li>El scraping de propiedades (PropertySource) debe realizarse sobre fuentes públicas donde el usuario tenga permisos o sea el propietario de la información.</li>
                    <li>La plataforma no se hace responsable por alucinaciones de la IA o respuestas incorrectas generadas por modelos de terceros.</li>
                  </ul>
                </div>
              </section>

              {/* Section 3: Data Privacy & Audit */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Lock className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">3. Privacidad y Auditoría de Plataforma</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    <strong>Acceso Administrativo:</strong> El Superadmin de RaicesPilot se reserva el derecho de acceder a los workspaces para tareas de mantenimiento, soporte técnico y auditoría de seguridad.
                  </p>
                  <p>
                    <strong>Cero Mutaciones sin Aviso:</strong> Los datos operativos de la inmobiliaria son propiedad del cliente. RaicesPilot garantiza el aislamiento de datos entre organizaciones.
                  </p>
                </div>
              </section>

              {/* Section 4: WhatsApp Cloud API */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Globe className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">4. WhatsApp Cloud API (Meta)</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    El uso de la integración de WhatsApp está sujeto a las políticas comerciales de Meta. El bloqueo de números por parte de Meta debido a malas prácticas del usuario no es responsabilidad de RaicesPilot.
                  </p>
                </div>
              </section>

              {/* Section 5: Propiedad Intelectual */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <Scale className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">5. Propiedad Intelectual y Restricciones</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    Todo el código fuente, algoritmos, diseños de interfaz, logotipos y estructuras de datos de RaicesPilot son propiedad exclusiva del desarrollador/propietario de la plataforma. 
                  </p>
                  <p>
                    Queda estrictamente prohibido cualquier intento de ingeniería inversa, copia parcial o total del código, o extracción de datos para el entrenamiento de modelos competitivos externos. La licencia de uso es personal, intransferible y revocable en caso de violación de estos términos.
                  </p>
                </div>
              </section>

              {/* Section 6: Limitación de Responsabilidad */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <ShieldCheck className="h-6 w-6 text-brand-600" />
                  <h2 className="text-xl font-bold">6. Garantías y Responsabilidad</h2>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                  <p>
                    RaicesPilot se esfuerza por mantener un tiempo de actividad (uptime) del 99.9%, pero no garantiza la disponibilidad ininterrumpida ante fallos de proveedores externos (Railway, OpenAI, WhatsApp). 
                  </p>
                  <p>
                    En ningún caso la plataforma será responsable por lucro cesante o pérdidas comerciales derivadas del uso o imposibilidad de uso del software.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Sticky Acceptance Footer */}
          <div className="p-8 sm:p-12 bg-slate-50 border-t border-slate-100 mt-auto">
            <div className="mb-6 flex items-start gap-3 p-4 bg-brand-50 rounded-2xl border border-brand-100">
               <ShieldCheck className="h-5 w-5 text-brand-600 mt-0.5" />
               <p className="text-xs text-brand-900 leading-relaxed">
                 Al hacer clic en "Aceptar y Entrar", confirmás que has leído íntegramente las políticas de servicio, privacidad, propiedad intelectual y uso de IA. Tu aceptación quedará registrada con marca de tiempo inmutable.
               </p>
            </div>

            <form action={acceptAction}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-[0.98] group"
              >
                <UserCheck className="h-6 w-6 group-hover:scale-110 transition-transform" />
                Aceptar y Entrar a la Plataforma
              </button>
            </form>
            <p className="mt-4 text-center text-[10px] text-slate-400 uppercase tracking-widest font-medium">
              RaicesPilot Enterprise Infrastructure v2.5.1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

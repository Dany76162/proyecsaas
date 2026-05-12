import { redirect } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { Montserrat } from "next/font/google";

import { loginAction } from "@/server/auth/actions";
import { resolveSignedInHomePath } from "@/server/auth/access";
import { getSessionUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    signedOut?: string;
  }>;
};

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid-credentials":
      return "Email o clave de acceso inválidos.";
    case "activation-required":
      return "Tu acceso todavía no fue activado. Abrí el link de invitación para crear tu clave.";
    case "no-memberships":
      return "Tu usuario no tiene membresías activas.";
    case "too-many-attempts":
      return "Demasiados intentos fallidos. Por favor, esperá unos minutos antes de reintentar.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(await resolveSignedInHomePath(sessionUser));
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next ?? "";
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row bg-white", montserrat.className)}>
      {/* Lado Izquierdo - Institucional (60%) */}
      <div className="relative hidden lg:flex lg:w-[60%] flex-col items-center justify-center bg-[#020617] px-24 py-12 text-white overflow-hidden border-r border-white/5">
        {/* Fondo abstracto institucional refinado */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] h-[800px] w-[800px] rounded-full bg-brand-900/10 blur-[160px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[700px] w-[700px] rounded-full bg-slate-900/30 blur-[140px]" />
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.015) 1px, transparent 0)`,
              backgroundSize: '64px 64px' 
            }} 
          />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center">
          {/* Logo Oficial RaícesPilot (Tamaño Imponente) */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 -mt-36 -mb-36">
            <Image
              src="/brand/raices_pilot_logo_transparent.png"
              alt="RaícesPilot"
              width={1000}
              height={500}
              className="h-auto w-[750px] max-w-full opacity-100 drop-shadow-2xl pointer-events-none"
              priority
            />
          </div>
          
          <p className="-mt-12 text-xl text-slate-400 leading-relaxed font-medium max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 relative z-20">
            Centralizá leads, conversaciones y seguimiento inmobiliario en una arquitectura diseñada para el alto rendimiento.
          </p>

          <div className="mt-24 grid grid-cols-2 gap-12 w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <div className="flex flex-col items-center group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20">
                <CheckCircle2 className="h-7 w-7 text-brand-400" />
              </div>
              <div className="mt-5">
                <h3 className="font-bold text-lg text-slate-100">Atención 24/7</h3>
                <p className="mt-1.5 text-sm text-slate-500 font-medium">Respuesta inmediata impulsada por IA.</p>
              </div>
            </div>

            <div className="flex flex-col items-center group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20">
                <Zap className="h-7 w-7 text-brand-400" />
              </div>
              <div className="mt-5">
                <h3 className="font-bold text-lg text-slate-100">Leads Calificados</h3>
                <p className="mt-1.5 text-sm text-slate-500 font-medium">Perfilado automático de alta precisión.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer institucional */}
        <div className="absolute bottom-12 inset-x-0 flex items-center justify-center gap-12 text-[10px] font-bold uppercase tracking-[0.5em] text-slate-600/80">
          <span>v2.5.1 Stable</span>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <span>Inmuebles Digitales © 2026</span>
        </div>
      </div>

      {/* Lado Derecho - Formulario (40%) */}
      <div className="flex flex-1 flex-col items-center justify-center px-12 py-12 lg:w-[40%] bg-slate-50/20">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Ícono de Brújula Oscuro (Desktop & Mobile) */}
            <div className="-mb-4">
              <Image 
                src="/brand/logo_transparent_icon.png" 
                alt="Logo RaícesPilot" 
                width={300} 
                height={300} 
                className="h-auto w-[240px] brightness-0 opacity-95 pointer-events-none" 
              />
            </div>
            
            <h3 className="text-4xl font-black tracking-tight text-slate-950">
              Acceder
            </h3>
            <p className="mt-3 text-slate-500 font-medium text-lg">
              Ingresá a tu entorno corporativo.
            </p>
          </div>

          <Card variant="default" className="border-none bg-transparent shadow-none p-0">
            <form action={loginAction} className="space-y-8">
              <input type="hidden" name="next" value={nextPath} />

              <div className="space-y-3">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Email Corporativo
                </label>
                <Input
                  type="email"
                  name="email"
                  required
                  placeholder="ejemplo@inmobiliaria.com"
                  className="h-14 bg-white border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:ring-brand-600 focus:border-brand-600 text-base rounded-xl transition-all"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    Clave de Acceso
                  </label>
                  <a 
                    href="https://wa.me/5491161630205?text=Hola%2C%20olvidé%20mi%20clave%20de%20acceso%20a%20RaicesPilot.%20¿Podrían%20ayudarme%20a%20restablecerla%3F" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider"
                  >
                    ¿Olvidaste tu clave?
                  </a>
                </div>
                <Input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="h-14 bg-white border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:ring-brand-600 focus:border-brand-600 text-base rounded-xl transition-all"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3.5 text-xs font-bold text-red-600 shadow-sm animate-in fade-in slide-in-from-top-1">
                  {errorMessage}
                </div>
              )}

              {resolvedSearchParams?.signedOut && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3.5 text-xs font-bold text-emerald-600 shadow-sm">
                  La sesión se cerró correctamente.
                </div>
              )}

              <div className="pt-4">
                <Button type="submit" size="lg" className="w-full h-14 text-sm font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-500/15 active:scale-[0.98] transition-all bg-brand-600 hover:bg-brand-700 rounded-xl">
                  Ingresar al Sistema
                </Button>
              </div>
            </form>
          </Card>

          <div className="mt-20 pt-10 border-t border-slate-200/60">
            <p className="text-center text-[13px] text-slate-400 font-medium">
              ¿No tenés acceso? <a href="https://wa.me/5491161630205?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20RaicesPilot%20para%20mi%20inmobiliaria." target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-brand-600 transition-colors underline decoration-slate-300 underline-offset-8 decoration-2">Solicitá una demo</a>
            </p>
          </div>
        </div>
      </div>
    </div>



  );
}

import { Building2 } from "lucide-react";

import Link from "next/link";
import { AlertTriangle, Phone, ArrowLeft, Building2, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; name?: string }>;
}) {
  const { name } = await searchParams;
  const orgName = name ?? "tu workspace";
  const waContact = process.env.PLATFORM_WHATSAPP_CONTACT ?? "";
  const waLink = waContact
    ? `https://wa.me/${waContact.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, quisiera reactivar la cuenta de ${orgName} en Raíces Pilot.`)}`
    : null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-white">
      {/* Lado Izquierdo - Institucional (60%) */}
      <div className="relative hidden lg:flex lg:w-[60%] flex-col justify-center bg-slate-950 px-16 py-12 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-600 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-brand-900 blur-[100px]" />
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
              backgroundSize: '32px 32px' 
            }} 
          />
        </div>

        <div className="relative z-10 max-w-xl">
          <Badge variant="brand" className="mb-6 border-brand-500/30 bg-brand-500/10 text-brand-400">
            Account Status
          </Badge>
          
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1]">
            Tu información está<br />
            <span className="text-brand-400">protegida.</span>
          </h1>
          
          <p className="mt-6 text-xl text-slate-400 leading-relaxed">
            Aunque el acceso está pausado temporalmente, tus datos y configuraciones permanecen intactos y seguros.
          </p>

          <div className="mt-12 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Datos resguardados</h3>
                <p className="text-sm text-slate-400">Tu historial de leads y conversaciones está cifrado y esperando ser reactivado.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <Zap className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100">Restauración inmediata</h3>
                <p className="text-sm text-slate-400">Una vez regularizada la situación, el acceso se habilita de forma automática.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-16 right-16 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          <span>RaícesPilot v2.0</span>
          <span>© 2026 Inmuebles Digitales</span>
        </div>
      </div>

      {/* Lado Derecho - Mensaje de Suspensión (40%) */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:w-[40%] bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center lg:items-start">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-500/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-slate-900">
                Raíces<span className="text-brand-600">Pilot</span>
              </span>
            </div>
            
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Cuenta Suspendida
            </h2>
            <p className="mt-1.5 text-sm font-bold text-slate-600">
              {orgName}
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-left">
              <p className="text-sm font-bold text-red-800 leading-relaxed">
                El acceso fue suspendido por falta de pago o por acción administrativa.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-red-700 list-disc list-inside">
                <li>Tus datos están guardados de forma segura</li>
                <li>El acceso se restaura en minutos tras regularizar</li>
                <li>Podés comunicarte con soporte ahora mismo</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              {waLink && (
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 h-12">
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Phone className="mr-2 h-4 w-4" />
                    Hablar con Soporte
                  </a>
                </Button>
              )}

              <Button asChild variant="outline" className="h-11">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Link>
              </Button>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-slate-400">
            ¿Creés que esto es un error? Contactá a tu administrador de plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}

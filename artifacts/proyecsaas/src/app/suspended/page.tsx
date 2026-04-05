import Link from "next/link";
import { AlertTriangle, Phone, ArrowLeft } from "lucide-react";

export default function SuspendedPage({
  searchParams,
}: {
  searchParams: { org?: string; name?: string };
}) {
  const orgName = searchParams.name ?? "tu workspace";
  const waContact = process.env.PLATFORM_WHATSAPP_CONTACT ?? "";
  const waLink = waContact
    ? `https://wa.me/${waContact.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola, quisiera reactivar la cuenta de ${orgName} en Raíces Pilot.`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="rounded-[2.5rem] border border-red-200 bg-white shadow-2xl overflow-hidden">
          {/* Top bar */}
          <div className="h-2 w-full bg-gradient-to-r from-red-500 to-orange-400" />

          <div className="p-10 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border-4 border-red-100 mb-6">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Cuenta Suspendida
            </h1>
            <p className="mt-2 text-base font-semibold text-slate-600">
              {orgName}
            </p>

            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-left">
              <p className="text-sm font-semibold text-red-800 leading-relaxed">
                El acceso a este workspace fue suspendido por falta de pago o por acción administrativa.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-red-700 list-disc list-inside">
                <li>Tus datos están guardados de forma segura</li>
                <li>El acceso se restaura en minutos tras regularizar el pago</li>
                <li>Podés comunicarte con soporte para más información</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
            >
              <Phone className="h-5 w-5" />
              Contactar Soporte por WhatsApp
            </a>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          Raíces Pilot · Si creés que esto es un error, contactá a tu administrador de plataforma.
        </p>
      </div>
    </div>
  );
}

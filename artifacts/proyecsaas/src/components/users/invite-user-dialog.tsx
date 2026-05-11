"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction } from "@/modules/users/actions";

export function InviteUserDialog({ orgSlug }: { orgSlug: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as any,
    };

    startTransition(async () => {
      setError(null);
      const result = await inviteUserAction(orgSlug, data);
      
      if (result.success) {
        setInviteUrl(result.data?.inviteUrl);
        router.refresh();
      } else {
        setError(result.message || "Error al invitar al usuario");
      }
    });
  }

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    alert("¡Enlace de invitación copiado al portapapeles!");
  };

  return (
    <>
      <button 
        onClick={() => {
          setIsOpen(true);
          setInviteUrl(null);
          setError(null);
        }}
        className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Invitar miembro
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-xl relative top-0 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {inviteUrl ? "Invitación generada" : "Invitar nuevo miembro"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {inviteUrl 
                ? "Enviá este enlace al usuario para que configure su acceso y contraseña personal."
                : "Agregá un nuevo miembro al equipo de esta inmobiliaria."}
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            {inviteUrl ? (
              <div className="mt-6 flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Enlace de invitación personal
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-950">
                    {inviteUrl}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                >
                  Copiar link
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre completo</label>
                  <input 
                    required 
                    name="fullName" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500" 
                    placeholder="Ej. Juan Pérez" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
                  <input 
                    required 
                    type="email"
                    name="email" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500" 
                    placeholder="Ej. juan@inmobiliaria.com" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Rol</label>
                  <select 
                    required 
                    name="role" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="AGENT">Agente de ventas</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="ASSISTANT">Asistente</option>
                    <option value="OWNER">Titular</option>
                  </select>
                </div>

                <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button 
                    type="button" 
                    onClick={() => setIsOpen(false)} 
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isPending} 
                    className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isPending ? "Generando..." : "Enviar invitación"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

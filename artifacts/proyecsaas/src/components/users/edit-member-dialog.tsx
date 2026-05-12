"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberProfileAction } from "@/modules/users/actions";
import type { OrganizationMember } from "@/modules/users/types";

interface EditMemberDialogProps {
  orgSlug: string;
  member: OrganizationMember;
}

export function EditMemberDialog({ orgSlug, member }: EditMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleOpen() {
    setError(null);
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      userId: member.id,
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      jobTitle: formData.get("jobTitle") as string,
      phone: formData.get("phone") as string,
      whatsapp: formData.get("whatsapp") as string,
      zone: formData.get("zone") as string,
      agentNotes: formData.get("agentNotes") as string,
      isActive: formData.get("isActive") === "true",
    };

    startTransition(async () => {
      setError(null);
      const result = await updateMemberProfileAction(orgSlug, data);

      if (result.success) {
        router.refresh();
        handleClose();
      } else {
        setError(result.message ?? "Error al guardar.");
      }
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Editar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Editar perfil
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Actualizá los datos operativos de{" "}
              <span className="font-medium text-slate-700">{member.fullName}</span>.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nombre completo
                  </label>
                  <input
                    required
                    name="fullName"
                    defaultValue={member.fullName}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    defaultValue={member.email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Cargo / Título
                  </label>
                  <input
                    name="jobTitle"
                    defaultValue={member.jobTitle === "Miembro del equipo" ? "" : member.jobTitle}
                    placeholder="Ej. Agente senior"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Teléfono
                  </label>
                  <input
                    name="phone"
                    defaultValue={member.phone ?? ""}
                    placeholder="Ej. +54 9 11 1234-5678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    WhatsApp
                  </label>
                  <input
                    name="whatsapp"
                    defaultValue={member.whatsapp ?? ""}
                    placeholder="Ej. +54 9 11 1234-5678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Zona de operación
                  </label>
                  <input
                    name="zone"
                    defaultValue={member.zone ?? ""}
                    placeholder="Ej. Palermo, CABA"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notas internas
                </label>
                <textarea
                  name="agentNotes"
                  rows={3}
                  defaultValue={member.agentNotes ?? ""}
                  placeholder="Especialidades, horarios, observaciones..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Estado
                </label>
                <select
                  name="isActive"
                  defaultValue={member.isActive ? "true" : "false"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2, Copy, Check, MessageCircle } from "lucide-react";
import { quickOnboardOrgAction } from "@/modules/platform/actions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form fields
  const [orgName, setOrgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [error, setError] = useState("");

  // Result state
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setOrgName("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setError("");
    setInviteUrl(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await quickOnboardOrgAction({
        orgName,
        ownerName: ownerName.trim() || undefined,
        ownerEmail,
        ownerPhone: ownerPhone.trim() || undefined,
      });
      if (res.success && res.data?.inviteUrl) {
        setInviteUrl(res.data.inviteUrl as string);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildWhatsAppUrl = () => {
    if (!inviteUrl) return "#";
    const phone = ownerPhone.replace(/\D/g, "");
    const text = `¡Hola! Te envío el acceso a tu panel de gestión en Raíces Pilot.\n\nIngresá con este link y creá tu contraseña:\n${inviteUrl}\n\nEl link es válido por 7 días.`;
    const encoded = encodeURIComponent(text);
    return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        <Building2 className="mr-2 h-4 w-4" />
        Nueva Inmobiliaria
      </Button>

      <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 border border-brand-100 mb-2">
              <Building2 className="h-5 w-5 text-brand-600" />
            </div>
            <DialogTitle>Nueva Inmobiliaria</DialogTitle>
            <DialogDescription>
              Se genera el acceso automáticamente y el link de invitación.
            </DialogDescription>
          </DialogHeader>

          {!inviteUrl ? (
            /* ── Formulario ── */
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Nombre de la inmobiliaria <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ej: Raíces Pilar"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Nombre del titular
                  <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ej: Martín García"
                />
                <p className="text-[11px] text-slate-400">Nombre con el que se registrará el acceso.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Email del titular <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="titular@ejemplo.com"
                />
                <p className="text-[11px] text-slate-400">El titular usará este email para ingresar.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  WhatsApp del titular
                  <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 select-none">+</span>
                  <Input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="549XXXXXXXXXX"
                    className="pl-7"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Código de país + número. Ej: 549341XXXXXXX</p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={handleClose} type="button">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !orgName.trim() || !ownerEmail.trim()}
                >
                  {isPending ? "Creando acceso..." : "Crear y generar link"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* ── Resultado: link listo ── */
            <div className="space-y-5 py-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-800">
                  ¡Listo! Inmobiliaria creada.
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Válido por 7 días. El titular crea su contraseña al entrar.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Link de acceso
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                  <p className="flex-1 truncate px-2 text-xs font-mono text-slate-700">
                    {inviteUrl}
                  </p>
                  <Button
                    variant={copied ? "success" : "secondary"}
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  asChild
                  className="bg-[#25D366] hover:bg-[#1ebe5c] text-white border-none shadow-none"
                >
                  <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar por WhatsApp
                  </a>
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

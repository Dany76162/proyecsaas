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
  // Mensaje prearmado, editable por el humano antes de enviar.
  const [message, setMessage] = useState("");
  const [copiedMsg, setCopiedMsg] = useState(false);

  const resetForm = () => {
    setOrgName("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setError("");
    setInviteUrl(null);
    setCopied(false);
    setMessage("");
    setCopiedMsg(false);
  };

  // Mensaje demo prearmado (editable). {nombre} → titular si lo hay; {link} → inviteUrl.
  const buildMessage = (url: string) => {
    const greeting = ownerName.trim() ? `Hola ${ownerName.trim()},` : "Hola,";
    return `${greeting} ya preparamos tu acceso demo a Raíces Pilot.

Podés ingresar desde este link:
${url}

Con este acceso vas a poder entrar al panel, cargar la información inicial de tu empresa y ver cómo se organiza el flujo de WhatsApp, oportunidades, propiedades/desarrollos y seguimiento comercial.

Cuando ingreses, avisame y te acompaño con la configuración inicial.`;
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
        const url = res.data.inviteUrl as string;
        setInviteUrl(url);
        setMessage(buildMessage(url));
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

  // Solo devuelve URL si hay teléfono del titular; sin teléfono se deshabilita el botón.
  const ownerDigits = ownerPhone.replace(/\D/g, "");
  const whatsappUrl = ownerDigits
    ? `https://wa.me/${ownerDigits}?text=${encodeURIComponent(message)}`
    : null;

  const handleCopyMessage = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        <Building2 className="mr-2 h-4 w-4" />
        Nueva cuenta demo
      </Button>

      <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 border border-brand-100 mb-2">
              <Building2 className="h-5 w-5 text-brand-600" />
            </div>
            <DialogTitle>Nueva cuenta demo</DialogTitle>
            <DialogDescription>
              Creá el acceso para una inmobiliaria, desarrolladora o equipo comercial.
            </DialogDescription>
          </DialogHeader>

          {!inviteUrl ? (
            /* â”€â”€ Formulario â”€â”€ */
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Nombre de la empresa <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ej: Raíces Pilar, Urbania Desarrollos o Grupo Norte"
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
            /* â”€â”€ Resultado: link listo â”€â”€ */
            <div className="space-y-5 py-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-bold text-emerald-800">
                  ¡Listo! Cuenta demo creada.
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

              {/* Mensaje prearmado y editable — el humano puede ajustarlo antes de enviar. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mensaje para el titular
                  </p>
                  <Button
                    variant={copiedMsg ? "success" : "secondary"}
                    size="sm"
                    onClick={handleCopyMessage}
                    className="h-7 gap-1.5 px-2 text-xs"
                  >
                    {copiedMsg ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedMsg ? "Copiado" : "Copiar mensaje"}
                  </Button>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                {whatsappUrl ? (
                  <Button
                    asChild
                    className="bg-[#25D366] hover:bg-[#1ebe5c] text-white border-none shadow-none"
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled
                      className="bg-[#25D366]/40 text-white border-none shadow-none cursor-not-allowed"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Abrir WhatsApp
                    </Button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Sin WhatsApp del titular: copiá el mensaje y enviáselo manualmente.
                    </p>
                  </>
                )}
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

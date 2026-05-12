"use client";

import { useState } from "react";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function AccessRequestForm() {
  const [formData, setFormData] = useState({
    orgName: "",
    contactName: "",
    email: "",
    whatsapp: "",
    city: "",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.orgName.trim()) newErrors.orgName = "El nombre de la inmobiliaria es obligatorio.";
    if (!formData.contactName.trim()) newErrors.contactName = "El nombre del contacto es obligatorio.";
    if (!formData.email.trim()) {
      newErrors.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Formato de email inválido.";
    }
    if (!formData.whatsapp.trim()) newErrors.whatsapp = "El WhatsApp es obligatorio.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const message = `Hola, quiero solicitar una demo de RaicesPilot.

Datos de la inmobiliaria:
* Inmobiliaria: ${formData.orgName}
* Contacto: ${formData.contactName}
* Email: ${formData.email}
* WhatsApp: ${formData.whatsapp}
* Ciudad/Zona: ${formData.city || "No especificada"}
* Mensaje: ${formData.message || "Sin mensaje adicional"}`;

    const whatsappUrl = `https://wa.me/5491161630205?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mb-8 text-left">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="orgName" className="text-sm font-bold text-slate-700">
              Nombre de la inmobiliaria <span className="text-red-500">*</span>
            </label>
            <Input
              id="orgName"
              placeholder="Ej: Inmobiliaria Central"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
              error={!!errors.orgName}
            />
            {errors.orgName && <p className="text-[11px] font-bold text-red-600 leading-none mt-1">{errors.orgName}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contactName" className="text-sm font-bold text-slate-700">
              Nombre del titular o contacto <span className="text-red-500">*</span>
            </label>
            <Input
              id="contactName"
              placeholder="Ej: Juan Pérez"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              error={!!errors.contactName}
            />
            {errors.contactName && <p className="text-[11px] font-bold text-red-600 leading-none mt-1">{errors.contactName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-bold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="titular@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
              />
              {errors.email && <p className="text-[11px] font-bold text-red-600 leading-none mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="whatsapp" className="text-sm font-bold text-slate-700">
                WhatsApp <span className="text-red-500">*</span>
              </label>
              <Input
                id="whatsapp"
                placeholder="+54 9 11..."
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                error={!!errors.whatsapp}
              />
              {errors.whatsapp && <p className="text-[11px] font-bold text-red-600 leading-none mt-1">{errors.whatsapp}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="city" className="text-sm font-bold text-slate-700">
              Ciudad / zona <span className="text-xs font-normal text-slate-400 ml-1">(opcional)</span>
            </label>
            <Input
              id="city"
              placeholder="Ej: Pilar, Buenos Aires"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message" className="text-sm font-bold text-slate-700">
              Mensaje adicional <span className="text-xs font-normal text-slate-400 ml-1">(opcional)</span>
            </label>
            <Textarea
              id="message"
              placeholder="¿Alguna consulta específica?"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="pt-4 space-y-4">
            <Button type="submit" size="lg" className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 h-12">
              <MessageCircle className="mr-2 h-5 w-5" />
              Solicitar demo por WhatsApp
            </Button>
            
            <Button variant="outline" size="lg" className="w-full text-slate-600 h-12" asChild>
              <a href="mailto:adminraicespilot@gmail.com">
                <Mail className="mr-2 h-4 w-4" /> Enviar email
              </a>
            </Button>
          </div>
        </form>
      </div>

      <p className="text-[13px] text-slate-500 leading-relaxed max-w-lg mx-auto">
        El acceso a la plataforma se habilita de forma controlada. Una vez aprobada la solicitud, el equipo podrá enviarte el link correspondiente para configurar tu cuenta.
      </p>
    </div>
  );
}

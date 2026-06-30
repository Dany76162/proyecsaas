"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";
import { handoffToDemoAgentAction } from "@/modules/prospecting/actions";

interface HandoffDemoModalProps {
  prospectId: string;
  phone: string;
}

export function HandoffDemoModal({ prospectId, phone }: HandoffDemoModalProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(
    "Hola, soy Daniel, creador de Raíces Pilot. Estamos mostrando una herramienta para inmobiliarias y desarrolladoras que automatiza consultas por WhatsApp, organiza oportunidades y permite mostrar propiedades, desarrollos y lotes con IA. ¿Te interesa que te pase una demo corta?"
  );

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await handoffToDemoAgentAction(prospectId, message);
      setOpen(false);
    } catch (error: any) {
      alert(error.message || "Ocurrió un error al derivar el prospecto");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
      >
        <Bot className="mr-2 h-4 w-4" />
        Preparar derivación a Agente Demo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Derivar a Agente Demo</DialogTitle>
            <DialogDescription>
              Se creará un Lead en la organización Demo y el IA tomará control si el usuario responde.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Teléfono Destino</label>
              <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">{phone}</p>
            </div>
            
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Mensaje Inicial (WhatsApp)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full mt-1 min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading || !message.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isLoading ? "Enviando..." : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar y Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

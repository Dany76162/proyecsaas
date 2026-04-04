"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

interface CrmAction {
  leadInterested: boolean;
  visitCreated: boolean;
  visitScheduledAt?: string;
  escalated: boolean;
  escalationReason?: string;
  leadNameUpdated?: string;
  visitPropertyId?: string;
}

interface AgentTestChatProps {
  agentId: string;
  orgSlug: string;
  agentName: string;
}

export function AgentTestChat({ agentId, orgSlug, agentName }: AgentTestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [leadId, setLeadId] = useState<string | undefined>();
  const [lastActions, setLastActions] = useState<CrmAction | null>(null);
  const [contactPhone] = useState(() => `5491170${Math.floor(100000 + Math.random() * 900000)}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text, timestamp: new Date() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          orgSlug,
          contactName: "Usuario de prueba",
          contactPhone,
          message: text,
          conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            text: `Error: ${data.error ?? "No se pudo procesar el mensaje"}`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setConversationId(data.conversationId);
      setLeadId(data.leadId);
      setLastActions(data.actions);

      setMessages((prev) => [
        ...prev,
        { role: "agent", text: data.response, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Error de conexión. Revisá que el servidor esté activo.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function reset() {
    setMessages([]);
    setConversationId(undefined);
    setLeadId(undefined);
    setLastActions(null);
  }

  return (
    <div className="rounded-[1.75rem] border bg-white shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-base">
            💬
          </div>
          <div>
            <p className="font-semibold text-slate-900">Probar agente</p>
            <p className="text-xs text-slate-500">
              Simulá una conversación de WhatsApp con {agentName}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Nueva conversación
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Chat area */}
        <div className="col-span-2 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[320px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <span className="text-3xl">📱</span>
                <p className="text-sm">Escribí un mensaje para comenzar la simulación</p>
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                  {["Hola, busco un depto de 2 ambientes", "¿Tienen propiedades en Palermo?", "Quiero hablar con alguien"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "agent" && (
                    <p className="mb-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      {agentName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${msg.role === "user" ? "text-brand-200" : "text-slate-400"}`}
                  >
                    {msg.timestamp.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí un mensaje... (Enter para enviar)"
                rows={2}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200 transition"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* CRM Sidebar */}
        <div className="border-l bg-slate-50 p-4 rounded-br-[1.75rem] lg:rounded-tr-[1.75rem]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Estado en el CRM
          </p>

          {!conversationId && (
            <p className="text-xs text-slate-400 italic">
              El CRM se actualiza automáticamente cuando el agente responde.
            </p>
          )}

          {conversationId && (
            <div className="space-y-3">
              <CrmRow label="Conversación" value={conversationId.slice(0, 10) + "…"} />
              {leadId && <CrmRow label="Lead ID" value={leadId.slice(0, 10) + "…"} />}
              {lastActions && (
                <>
                  {lastActions.leadInterested && (
                    <CrmPill color="green" label="Lead: INTERESADO" />
                  )}
                  {lastActions.leadNameUpdated && (
                    <CrmPill color="blue" label={`Nombre: ${lastActions.leadNameUpdated}`} />
                  )}
                  {lastActions.visitCreated && lastActions.visitScheduledAt && (
                    <CrmPill
                      color="purple"
                      label={`Visita: ${new Date(lastActions.visitScheduledAt).toLocaleDateString("es-AR")}`}
                    />
                  )}
                  {lastActions.escalated && (
                    <CrmPill
                      color="red"
                      label={`Escalado: ${lastActions.escalationReason ?? "manual"}`}
                    />
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-6 border-t pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Contacto simulado
            </p>
            <p className="text-xs text-slate-600 break-all">
              📱 +{contactPhone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-mono text-slate-700">{value}</span>
    </div>
  );
}

function CrmPill({ color, label }: { color: "green" | "blue" | "purple" | "red"; label: string }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]}`}>
      {label}
    </span>
  );
}

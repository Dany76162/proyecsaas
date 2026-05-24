"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type TourAiChatProps = {
  propertyId: string;
};

export function TourAiChat({ propertyId }: TourAiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente virtual. Estoy acá para responder cualquier pregunta sobre esta propiedad mientras hacés el recorrido 360°. ¿Qué te gustaría saber?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to history
    setHistory((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/tour-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          message: userMessage,
          history: history.slice(1), // Exclude welcome message to avoid noise
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      
      // Add assistant response to history
      setHistory((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Disculpame, tuve un problema para procesar tu consulta. ¿Podrías volver a intentar?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="absolute bottom-16 right-4 z-40 flex flex-col items-end pointer-events-auto">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="mb-3 flex h-[400px] w-[min(310px,90vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B14]/90 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Asistente Virtual IA</p>
                <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En línea
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              title="Cerrar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {history.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-normal shadow-sm ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white/5 border border-white/[0.06] text-white/90 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Loading / Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 border border-white/[0.06] px-3.5 py-2.5 text-xs text-white/40 rounded-tl-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 border-t border-white/[0.08] bg-white/[0.01] p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntame lo que quieras..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-indigo-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
              title="Enviar"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:scale-105 ${
          isOpen
            ? "bg-slate-800 border border-white/10 hover:bg-slate-700"
            : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_4px_20px_rgba(79,70,229,0.35)]"
        }`}
        title={isOpen ? "Cerrar chat" : "Preguntale a la IA sobre esta propiedad"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}

"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Search, Send, User, Clock, Check, MoreVertical, ArrowLeft } from "lucide-react";
import { formatRelativeTime } from "@/components/platform/platform-ui";
import { cn } from "@/lib/utils";
import type { getSupportConversations, getSupportMessages } from "./actions/support-actions";

type Conversation = Awaited<ReturnType<typeof getSupportConversations>>[number];
type Message = Awaited<ReturnType<typeof getSupportMessages>>[number];

export default function SupportChatUI({
  initialConversations,
  onSendAction,
  onFetchMessagesAction,
}: {
  initialConversations: Conversation[];
  onSendAction: (conversationId: string, text: string) => Promise<any>;
  onFetchMessagesAction: (conversationId: string) => Promise<Message[]>;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isFetchingMsgs, setIsFetchingMsgs] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeId) return;
    setIsFetchingMsgs(true);
    onFetchMessagesAction(activeId).then((msgs) => {
      setMessages(msgs);
      setIsFetchingMsgs(false);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    });
  }, [activeId]);

  const activeConv = conversations.find(c => c.id === activeId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !inputText.trim() || isPending) return;

    const text = inputText.trim();
    setInputText("");

    // Optimistic UI update
    const optimisticMsg = {
        id: Math.random().toString(),
        direction: "OUTBOUND" as const,
        body: text,
        sentAt: new Date(),
        senderName: "Tú",
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);

    startTransition(async () => {
      await onSendAction(activeId, text);
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl">
      {/* Sidebar de Chats */}
      <aside className={cn(
        "flex flex-col border-r border-slate-100 bg-slate-50/50",
        "w-full sm:w-80 sm:flex",
        mobileShowChat ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">Mensajes de Soporte</h2>
          <div className="mt-3 sm:mt-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
             <input
               type="text"
               placeholder="Buscar cliente..."
               className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { setActiveId(conv.id); setMobileShowChat(true); }}
              className={cn(
                "w-full px-4 sm:px-6 py-4 sm:py-5 text-left transition-all hover:bg-slate-100/50 border-l-4",
                activeId === conv.id ? "bg-white border-indigo-600 shadow-sm" : "border-transparent"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-slate-900 truncate">{conv.participantName}</span>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                    {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate line-clamp-1 italic">{conv.lastMessage || "Sin mensajes"}</p>
              <div className="mt-2 text-[10px] font-bold text-slate-400 tracking-tight">{conv.participantPhone}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Area de Chat */}
      <main className={cn(
        "flex flex-1 flex-col bg-white overflow-hidden",
        !mobileShowChat ? "hidden sm:flex" : "flex"
      )}>
        {activeId ? (
          <>
            {/* Header del Chat */}
            <header className="flex h-16 items-center justify-between border-b border-slate-100 px-4 sm:px-6 shrink-0 bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                {/* Back button — mobile only */}
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition sm:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeConv?.participantName}</h3>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{activeConv?.participantPhone} · EN LÍNEA</p>
                </div>
              </div>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition">
                <MoreVertical className="h-5 w-5" />
              </button>
            </header>

            {/* Burbujas de Mensaje */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-[url('/chat-bg.png')] bg-repeat p-8 space-y-4"
              style={{ backgroundColor: '#f8fafc' }}
            >
              {isFetchingMsgs && (
                  <div className="flex items-center justify-center py-10 opacity-50">
                      <Clock className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-xs font-bold text-slate-400">Cargando conversación...</span>
                  </div>
              )}
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[70%]",
                    msg.direction === "OUTBOUND" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-medium shadow-sm",
                    msg.direction === "OUTBOUND" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  )}>
                    {msg.body}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.direction === "OUTBOUND" && <Check className="h-3 w-3 text-indigo-400" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Input de Mensaje */}
            <footer className="p-6 border-t border-slate-100 bg-white shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..." 
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                />
                <button 
                  disabled={!inputText.trim() || isPending}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  <Send className={cn("h-6 w-6", isPending && "animate-pulse")} />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
             <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                <Clock className="h-10 w-10 text-slate-200" />
             </div>
             <h3 className="text-base font-bold text-slate-900">Bandeja de Entrada Vacía</h3>
             <p className="mt-2 text-xs text-slate-400 max-w-xs">Selecciona una conversación de la izquierda para comenzar a responder.</p>
          </div>
        )}
      </main>
    </div>
  );
}

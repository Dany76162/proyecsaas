import { getSupportConversations, getSupportMessages, sendSupportResponse } from "./actions/support-actions";
import SupportChatUI from "./SupportChatUI";

export default async function SupportPage() {
  const initialConversations = await getSupportConversations();

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-indigo-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">AtenciÃ³n Directa</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Centro de Soporte</h1>
        <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
          RespondÃ© consultas directas de leads y clientes que escriben al nÃºmero maestro de la plataforma.
        </p>
      </div>

      <SupportChatUI
        initialConversations={initialConversations}
        onSendAction={sendSupportResponse}
        onFetchMessagesAction={getSupportMessages}
      />
    </div>
  );
}

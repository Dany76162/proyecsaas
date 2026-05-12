"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Globe, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  X,
  ChevronRight,
  Eye
} from "lucide-react";
import { preparePublicationAction, publishNowAction } from "@/modules/agents/meta-actions";
import { MetaPage } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PostPreview } from "@/components/agents/post-preview";

type MetaPublisherActionProps = {
  draft: any;
  metaStatus: {
    isConnected: boolean;
    pages: MetaPage[];
    flags: {
      publishing: boolean;
    };
  };
};

export function MetaPublisherAction({ draft, metaStatus }: MetaPublisherActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canPublish = metaStatus.isConnected && metaStatus.flags.publishing && draft.status === "APPROVED";
  const existingPublication = draft.publications?.[0];

  if (!canPublish && !existingPublication) return null;

  const handlePrepare = async () => {
    if (!selectedPageId) return;
    setIsPreparing(true);
    setError(null);
    try {
      const res = await preparePublicationAction(draft.id, selectedPageId);
      if (res.success && res.publicationId) {
        setPublicationId(res.publicationId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPreparing(false);
    }
  };

  const handlePublish = async () => {
    if (!publicationId) return;
    setIsPublishing(true);
    setError(null);
    try {
      const res = await publishNowAction(publicationId);
      if (res.success && res.externalPostId) {
        setPublishedId(res.externalPostId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (publishedId || existingPublication?.status === "PUBLISHED") {
    const postId = publishedId || existingPublication?.externalPostId;
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 border border-emerald-100">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Publicado</span>
        {postId && (
          <a 
            href={`https://facebook.com/${postId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            Ver <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="h-10 rounded-xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:bg-blue-700"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Preparar Publicación
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">Publicar en Meta</h3>
                  <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Paso {publicationId ? '2: Confirmar' : '1: Seleccionar Destino'}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {!publicationId ? (
                <div className="space-y-6">
                  <div className="grid gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Selecciona la página o cuenta</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {metaStatus.pages.length === 0 ? (
                        <div className="col-span-full p-6 text-center rounded-2xl border border-dashed border-slate-200">
                          <p className="text-sm font-medium text-slate-500">No hay páginas sincronizadas.</p>
                        </div>
                      ) : (
                        metaStatus.pages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => setSelectedPageId(page.id)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                              selectedPageId === page.id 
                                ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10" 
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn(
                              "h-10 w-10 flex items-center justify-center rounded-xl text-white shadow-sm",
                              page.platform === 'INSTAGRAM' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' : 'bg-blue-600'
                            )}>
                              {page.platform === 'INSTAGRAM' ? <Globe className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{page.name}</p>
                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{page.platform}</p>
                            </div>
                            <ChevronRight className={cn(
                              "h-4 w-4 transition-transform",
                              selectedPageId === page.id ? "text-blue-600 translate-x-1" : "text-slate-300"
                            )} />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Vista Previa Final
                    </p>
                    <div className="scale-[0.8] origin-top-left -mb-20">
                      <PostPreview 
                        platform={draft.platform}
                        content={draft.content}
                        hashtags={draft.hashtags}
                      />
                    </div>
                  </div>
                  <div className="space-y-6 flex flex-col justify-center">
                    <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                          <Share2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Página Destino</p>
                          <p className="text-sm font-bold text-slate-900">
                            {metaStatus.pages.find(p => p.id === selectedPageId)?.name}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] font-medium leading-relaxed text-blue-700/70">
                        Esta acción publicará el contenido aprobado directamente en tu cuenta de Meta. 
                        Asegúrate de revisar el texto y los hashtags antes de confirmar.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Listo para publicación</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ID Borrador: <span className="text-slate-600">{draft.id.slice(-8)}</span>
              </p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => publicationId ? setPublicationId(null) : setIsOpen(false)}
                  className="h-11 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest"
                >
                  {publicationId ? 'Atrás' : 'Cancelar'}
                </Button>
                
                {!publicationId ? (
                  <Button 
                    onClick={handlePrepare}
                    disabled={!selectedPageId || isPreparing}
                    className="h-11 rounded-xl bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Destino'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="h-11 rounded-xl bg-emerald-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar Ahora'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

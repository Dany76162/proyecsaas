"use client";

import { cn } from "@/lib/utils";
import { Camera, Globe, Users, MessageSquare, MoreHorizontal, Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share2, Globe2 } from "lucide-react";

interface PostPreviewProps {
  platform: "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "WHATSAPP_BUSINESS" | string;
  content: string;
  hashtags?: string[];
  title?: string;
  className?: string;
}

export function PostPreview({ platform, content, hashtags = [], title, className }: PostPreviewProps) {
  const formattedContent = content.split('\n').map((line, i) => (
    <span key={i}>{line}<br /></span>
  ));

  if (platform === "INSTAGRAM") {
    return (
      <div className={cn("overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm max-w-[360px] mx-auto", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
              <div className="h-full w-full rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-400">RP</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-900">RaicesPilot</span>
          </div>
          <MoreHorizontal className="h-4 w-4 text-slate-400" />
        </div>

        {/* Media Placeholder */}
        <div className="aspect-square w-full bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300 border-y border-slate-50">
          <Camera className="h-10 w-10 opacity-20" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Visual Placeholder</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-4">
            <Heart className="h-5 w-5 text-slate-700" />
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <Send className="h-5 w-5 text-slate-700" />
          </div>
          <Bookmark className="h-5 w-5 text-slate-700" />
        </div>

        {/* Caption */}
        <div className="px-4 pb-5 space-y-2">
          <div className="text-[12px] leading-relaxed text-slate-800">
            <span className="font-bold mr-2">raicespilot</span>
            {formattedContent}
          </div>
          <div className="flex flex-wrap gap-1">
            {hashtags.map((h, i) => (
              <span key={i} className="text-[12px] text-blue-800 font-medium">{h.startsWith('#') ? h : `#${h}`}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
              Vista previa Instagram
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "FACEBOOK") {
    return (
      <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm max-w-[480px] mx-auto", className)}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
              RP
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900">RaicesPilot</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <span>Sugerido para ti</span>
                <span>•</span>
                <Globe2 className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-[13px] leading-relaxed text-slate-800">
            {formattedContent}
          </div>

          <div className="flex flex-wrap gap-1">
            {hashtags.map((h, i) => (
              <span key={i} className="text-[13px] text-blue-700">{h.startsWith('#') ? h : `#${h}`}</span>
            ))}
          </div>
        </div>

        {/* Media Placeholder */}
        <div className="aspect-video w-full bg-slate-50 flex items-center justify-center border-y border-slate-100">
          <Globe className="h-12 w-12 text-slate-200" />
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex -space-x-1">
            <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center z-20">
               <ThumbsUp className="h-2 w-2 text-white fill-white" />
            </div>
            <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center z-10">
               <Heart className="h-2 w-2 text-white fill-white" />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Vista previa de Facebook</span>
        </div>

        <div className="px-2 py-1 flex items-center justify-around">
           <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-xs cursor-pointer">
              <ThumbsUp className="h-4 w-4" /> Me gusta
           </div>
           <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-xs cursor-pointer">
              <MessageCircle className="h-4 w-4" /> Comentar
           </div>
           <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-500 font-bold text-xs cursor-pointer">
              <Share2 className="h-4 w-4" /> Compartir
           </div>
        </div>
      </div>
    );
  }

  if (platform === "LINKEDIN") {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-w-[520px] mx-auto", className)}>
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-sm bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                RP
              </div>
              <div className="space-y-0.5">
                <p className="text-[13px] font-bold text-slate-900">RaicesPilot</p>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-1">Inteligencia Artificial para Inmobiliarias</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">Promocionado • <Globe2 className="h-2.5 w-2.5" /></p>
              </div>
            </div>
            <MoreHorizontal className="h-5 w-5 text-slate-400" />
          </div>

          <div className="text-[13px] leading-relaxed text-slate-800 space-y-2">
            {formattedContent}
          </div>

          <div className="flex flex-wrap gap-1">
            {hashtags.map((h, i) => (
              <span key={i} className="text-[13px] text-blue-700 font-bold hover:underline cursor-pointer">
                {h.startsWith('#') ? h : `#${h}`}
              </span>
            ))}
          </div>
        </div>

        <div className="aspect-[1.91/1] w-full bg-slate-50 border-y border-slate-100 flex flex-col items-center justify-center gap-2">
           <Users className="h-10 w-10 text-slate-200" />
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LinkedIn Media Card</span>
        </div>

        <div className="p-3 flex items-center gap-4 border-t border-slate-50">
           <div className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer">
              <ThumbsUp className="h-4 w-4" /> Recomendar
           </div>
           <div className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer">
              <MessageCircle className="h-4 w-4" /> Comentar
           </div>
           <div className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer">
              <Share2 className="h-4 w-4" /> Compartir
           </div>
           <div className="flex-1 text-right">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600">
                LinkedIn Preview
              </span>
           </div>
        </div>
      </div>
    );
  }

  // Default / WhatsApp / Other
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm max-w-[400px] mx-auto", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white">
          <MessageSquare className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-brand-600">
          Vista previa del contenido
        </span>
      </div>

      <div className="relative rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="text-[13px] leading-relaxed text-slate-800">
          {formattedContent}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {hashtags.map((h, i) => (
            <span key={i} className="text-[11px] text-brand-600 font-medium">{h.startsWith('#') ? h : `#${h}`}</span>
          ))}
        </div>
        <div className="absolute -left-2 top-4 h-4 w-4 bg-white rotate-45 border-l border-b border-slate-100" />
      </div>
      
      <div className="mt-4 flex justify-end">
         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
            {platform || "Contenido Genérico"}
         </span>
      </div>
    </div>
  );
}

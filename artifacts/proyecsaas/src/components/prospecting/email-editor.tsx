"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Bold, Italic, List, Link as LinkIcon,
  AlignLeft, AlignCenter, Sparkles, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function EmailEditor({ initialValue, onChange, placeholder }: EmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (editorRef.current && initialValue !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialValue;
    }
  }, []);

  // Focus the URL input when it appears
  useEffect(() => {
    if (showLinkInput) {
      setTimeout(() => urlInputRef.current?.focus(), 50);
    }
  }, [showLinkInput]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    handleInput();
  };

  // Save the current selection so it can be restored after the input loses focus
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore the saved selection into the editor
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const handleOpenLinkInput = () => {
    saveSelection();
    setLinkUrl("");
    setShowLinkInput(true);
  };

  const handleInsertLink = () => {
    let url = linkUrl.trim();

    if (!url) {
      toast.error("Ingresá una URL antes de insertar el enlace.");
      urlInputRef.current?.focus();
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    restoreSelection();
    execCommand("createLink", url);

    setShowLinkInput(false);
    setLinkUrl("");
    savedRangeRef.current = null;
  };

  const handleCancelLink = () => {
    setShowLinkInput(false);
    setLinkUrl("");
    savedRangeRef.current = null;
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInsertLink();
    }
    if (e.key === "Escape") {
      handleCancelLink();
    }
  };

  return (
    <div className={cn(
      "w-full rounded-[2rem] border-2 transition-all overflow-hidden bg-white shadow-soft",
      isFocused ? "border-brand-500 ring-4 ring-brand-500/10" : "border-slate-100"
    )}>
      {/* Toolbar */}
      <div className="bg-slate-50/50 p-2 border-b border-slate-100 flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("bold")} title="Negrita">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("italic")} title="Cursiva">
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("insertUnorderedList")} title="Lista">
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", showLinkInput && "bg-brand-50 text-brand-600")}
          onClick={handleOpenLinkInput}
          title="Insertar enlace"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("justifyLeft")} title="Alinear izquierda">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("justifyCenter")} title="Centrar">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-brand-50 text-brand-700 border-brand-100 text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
            <Sparkles className="h-3 w-3 mr-1" /> IA Ready
          </Badge>
        </div>
      </div>

      {/* Link input row — shown inline below toolbar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50/60 border-b border-brand-100">
          <LinkIcon className="h-3.5 w-3.5 text-brand-500 shrink-0" />
          <input
            ref={urlInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="https://ejemplo.com"
            className="flex-1 h-8 rounded-lg border border-brand-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition"
          />
          <button
            type="button"
            onClick={handleInsertLink}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition"
          >
            <Check className="h-3.5 w-3.5" />
            Insertar
          </button>
          <button
            type="button"
            onClick={handleCancelLink}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-h-[300px] p-8 outline-none prose prose-slate max-w-none font-medium text-slate-600 leading-relaxed"
        style={{
          fontSize: "15px"
        }}
      />

      {/* Footer / Placeholder */}
      {!initialValue && !isFocused && (
        <div className="absolute top-[4.5rem] left-8 pointer-events-none text-slate-300 font-medium italic">
          {placeholder || "Escribe el cuerpo del correo aquí..."}
        </div>
      )}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border", className)}>
      {children}
    </span>
  );
}

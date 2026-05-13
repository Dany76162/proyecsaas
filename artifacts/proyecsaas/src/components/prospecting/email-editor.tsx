"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bold, Italic, List, Link as LinkIcon, 
  Type, AlignLeft, AlignCenter, Sparkles,
  Undo, Redo
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
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && initialValue !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialValue;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    handleInput();
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
          const url = prompt("Ingresa la URL:");
          if (url) execCommand("createLink", url);
        }} title="Link">
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

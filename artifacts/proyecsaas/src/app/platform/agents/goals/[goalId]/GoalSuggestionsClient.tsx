"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Plus, ArrowRight, X, AlertCircle } from "lucide-react";
import { suggestGoalTasksAction, createSuggestedTasksAction } from "@/modules/agents/actions";
import { cn } from "@/lib/utils";

type Suggestion = {
  title: string;
  description: string;
};

export default function GoalSuggestionsClient({ goalId }: { goalId: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await suggestGoalTasksAction(goalId);
      if (res.success) {
        setSuggestions(res.data);
        setSelected(res.data.map((_, i) => i)); // Select all by default
      }
    } catch (err: any) {
      setError(err.message || "Error al generar sugerencias");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (selected.length === 0) return;
    setCreating(true);
    try {
      const tasksToCreate = suggestions.filter((_, i) => selected.includes(i));
      await createSuggestedTasksAction(goalId, tasksToCreate);
      setSuggestions([]);
      setSelected([]);
    } catch (err: any) {
      setError(err.message || "Error al crear tareas");
    } finally {
      setCreating(false);
    }
  }

  function toggleSelection(index: number) {
    setSelected(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }

  if (suggestions.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tareas Sugeridas</p>
          <button 
            onClick={() => setSuggestions([])}
            className="text-slate-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div 
              key={i}
              onClick={() => toggleSelection(i)}
              className={cn(
                "cursor-pointer rounded-2xl border p-4 transition-all",
                selected.includes(i) 
                  ? "border-brand-200 bg-brand-50 shadow-sm" 
                  : "border-slate-100 bg-white grayscale opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  selected.includes(i) ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200"
                )}>
                  {selected.includes(i) && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-black uppercase tracking-tight text-slate-900">{s.title}</h5>
                  <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{s.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[10px] font-bold text-red-500">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating || selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Crear {selected.length} tareas
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-[10px] font-bold text-red-700">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 py-4 text-[10px] font-black uppercase tracking-widest text-brand-600 transition hover:bg-brand-100 active:scale-95 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generar tareas sugeridas
          </>
        )}
      </button>
    </div>
  );
}

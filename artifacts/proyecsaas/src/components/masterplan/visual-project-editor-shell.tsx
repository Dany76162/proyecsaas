"use client";

interface VisualProjectEditorShellProps {
    proyectoId: string;
    step2Done: boolean;
    step3Done: boolean;
}

export default function VisualProjectEditorShell({
    proyectoId,
    step2Done,
}: VisualProjectEditorShellProps) {
    return (
        <div
            className="min-h-[640px] bg-slate-900"
            data-proyecto-id={proyectoId}
            data-step2-done={step2Done}
        />
    );
}

import { createAgentTask } from "@/modules/agents/actions";

export default function PlatformAgentsNewTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nueva tarea</h1>
        <p className="text-sm text-slate-500">Crea una tarea para el Director Operativo IA y el Agente de Marketing.</p>
        <div className="mt-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 border border-blue-100">
          Nota: Este MVP genera un borrador por ejecución.
        </div>
      </div>

      <form action={createAgentTask} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Título
            <input name="title" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Descripción
            <textarea name="description" rows={5} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Prioridad
              <select name="priority" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="LOW">Baja</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Plataforma de contenido
              <select name="platform" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="WHATSAPP_BUSINESS">WhatsApp Business</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tipo de contenido
            <select name="contentType" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="post">Post</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
              <option value="message">Mensaje</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Crear tarea
          </button>
        </div>
      </form>
    </div>
  );
}

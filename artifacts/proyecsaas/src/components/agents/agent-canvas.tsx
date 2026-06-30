"use client";

import { useState } from "react";

import "@xyflow/react/dist/style.css";

import Link from "next/link";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  ListChecks,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
  Share2,
  Calendar,
  Rocket,
  Network,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentCanvasData, AgentCanvasMetric, AgentCanvasNode } from "@/modules/agents/types";

type CanvasNodeData = AgentCanvasNode & {
  variant: "agent" | "workflow" | "activity";
};

type CanvasFlowNode = Node<CanvasNodeData, "agentCard">;

const toneClasses: Record<NonNullable<AgentCanvasMetric["tone"]>, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

const statusClasses: Record<string, string> = {
  Activo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Con actividad": "border-blue-200 bg-blue-50 text-blue-700",
  "Revisión disponible": "border-amber-200 bg-amber-50 text-amber-700",
  "Requiere revisión": "border-amber-200 bg-amber-50 text-amber-700",
  "Registrando eventos": "border-blue-200 bg-blue-50 text-blue-700",
};

function NodeIcon({ id }: { id: string }) {
  const iconClass = "h-5 w-5";
  switch (id) {
    case "orchestrator":
      return <Bot className={iconClass} />;
    case "marketing":
      return <Sparkles className={iconClass} />;
    case "tasks":
      return <ClipboardList className={iconClass} />;
    case "drafts":
      return <FileText className={iconClass} />;
    case "approvals":
      return <ShieldCheck className={iconClass} />;
    case "goals":
      return <Target className={iconClass} />;
    case "library":
      return <Users className={iconClass} />;
    case "automations":
      return <Zap className={iconClass} />;
    case "calendar":
      return <Calendar className={iconClass} />;
    case "meta":
      return <Share2 className={iconClass} />;
    case "governance":
      return <ShieldCheck className={iconClass} />;
    case "readiness":
      return <Rocket className={iconClass} />;
    case "orgchart":
      return <Network className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
}

function NodeRiskBadge({ node }: { node: CanvasNodeData }) {
  const hasError = node.metrics.some(m => m.tone === 'danger' && Number(m.value) > 0);
  const hasWarning = node.metrics.some(m => m.tone === 'warning' && Number(m.value) > 0);
  const isOperational = node.status === 'Activo' || node.status === 'Con actividad' || node.status === 'Registrando eventos';

  if (hasError) return <Badge variant="danger" className="gap-1"><AlertCircle className="h-2.5 w-2.5" /> Riesgo</Badge>;
  if (hasWarning) return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Atención</Badge>;
  if (isOperational) return <Badge variant="success" className="gap-1"><ShieldCheck className="h-2.5 w-2.5" /> OK</Badge>;
  return null;
}

function AgentCanvasCard({ data, selected }: NodeProps<CanvasFlowNode>) {
  return (
    <article
      className={cn(
        "w-[320px] rounded-[2rem] border bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-all",
        selected ? "border-brand-500 ring-[6px] ring-brand-500/10 scale-[1.02]" : "border-slate-200",
        data.variant === "agent" ? "bg-white" : "bg-slate-50/90",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-4 !border-white !bg-brand-600" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-4 !border-white !bg-brand-600" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 shadow-sm">
            <NodeIcon id={data.id} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-lg font-black tracking-tight text-slate-950 truncate">{data.title}</h3>
            <p className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{data.type}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className={cn(
          "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
          statusClasses[data.status] ?? "border-slate-200 bg-slate-50 text-slate-600",
        )}>
          {data.status}
        </span>
        <NodeRiskBadge node={data} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {data.metrics.slice(0, 3).map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "rounded-2xl border px-3 py-2.5 transition-all group-hover:bg-white",
              toneClasses[metric.tone ?? "neutral"],
            )}
          >
            <div className="text-xl font-black leading-none tracking-tight">{metric.value}</div>
            <div className="mt-1.5 text-[9px] font-black uppercase tracking-wider opacity-70 leading-3">{metric.label}</div>
          </div>
        ))}
      </div>

      {data.activities[0] ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
             <Activity className="h-3 w-3 text-brand-500" />
             <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Actividad</span>
          </div>
          <p className="line-clamp-2 text-xs font-medium leading-relaxed text-slate-600 italic">
            "{data.activities[0].message}"
          </p>
        </div>
      ) : null}
    </article>
  );
}

const nodeTypes = {
  agentCard: AgentCanvasCard,
};

function buildNodes(data: AgentCanvasData): CanvasFlowNode[] {
  return [
    {
      id: "orchestrator",
      type: "agentCard",
      position: { x: 50, y: 200 },
      data: { ...data.nodes.orchestrator, variant: "agent" },
    },
    {
      id: "goals",
      type: "agentCard",
      position: { x: -350, y: 200 },
      data: { ...data.nodes.goals, variant: "workflow" },
    },
    {
      id: "automations",
      type: "agentCard",
      position: { x: -350, y: 400 },
      data: { ...data.nodes.automations, variant: "workflow" },
    },
    {
      id: "library",
      type: "agentCard",
      position: { x: 50, y: -150 },
      data: { ...data.nodes.library, variant: "agent" },
    },
    {
      id: "marketing",
      type: "agentCard",
      position: { x: 450, y: 50 },
      data: { ...data.nodes.marketing, variant: "agent" },
    },
    {
      id: "tasks",
      type: "agentCard",
      position: { x: 450, y: 350 },
      data: { ...data.nodes.tasks, variant: "workflow" },
    },
    {
      id: "drafts",
      type: "agentCard",
      position: { x: 850, y: 50 },
      data: { ...data.nodes.drafts, variant: "workflow" },
    },
    {
      id: "logs",
      type: "agentCard",
      position: { x: 850, y: 400 },
      data: { ...data.nodes.logs, variant: "activity" },
    },
    {
      id: "approvals",
      type: "agentCard",
      position: { x: 1250, y: 200 },
      data: { ...data.nodes.approvals, variant: "workflow" },
    },
    {
      id: "calendar",
      type: "agentCard",
      position: { x: 1650, y: 200 },
      data: { ...data.nodes.calendar, variant: "workflow" },
    },
    {
      id: "meta",
      type: "agentCard",
      position: { x: 2050, y: 200 },
      data: { ...data.nodes.meta, variant: "workflow" },
    },
  ];
}

const initialEdges: Edge[] = [
  {
    id: "goals-automations",
    source: "goals",
    target: "automations",
  },
  {
    id: "automations-orchestrator",
    source: "automations",
    target: "orchestrator",
  },
  {
    id: "library-orchestrator",
    source: "library",
    target: "orchestrator",
  },
  {
    id: "orchestrator-marketing",
    source: "orchestrator",
    target: "marketing",
  },
  {
    id: "orchestrator-tasks",
    source: "orchestrator",
    target: "tasks",
  },
  {
    id: "marketing-drafts",
    source: "marketing",
    target: "drafts",
  },
  {
    id: "drafts-approvals",
    source: "drafts",
    target: "approvals",
  },
  {
    id: "tasks-logs",
    source: "tasks",
    target: "logs",
  },
  {
    id: "approvals-logs",
    source: "approvals",
    target: "logs",
  },
  {
    id: "calendar-meta",
    source: "calendar",
    target: "meta",
  },
].map((edge) => ({
  ...edge,
  type: "smoothstep",
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "#2563eb" },
  style: { stroke: "#2563eb", strokeWidth: 2, opacity: 0.4 },
}));

function DetailPanel({ node }: { node: CanvasNodeData }) {
  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col p-8 border-b border-slate-50 bg-slate-50/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white text-brand-600 shadow-sm border border-slate-100 ring-4 ring-brand-50/50">
            <NodeIcon id={node.id} />
          </div>
          <NodeRiskBadge node={node} />
        </div>
        
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 mb-1">{node.type}</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{node.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">{node.description}</p>
        </div>
      </div>

      <div className="p-8 space-y-8 flex-1 overflow-auto custom-scrollbar">
        <section className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Métricas Operativas</p>
          <div className="grid grid-cols-2 gap-3">
            {node.metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn("rounded-2xl border p-4 shadow-sm transition-all hover:bg-white", toneClasses[metric.tone ?? "neutral"])}
              >
                <p className="text-3xl font-black leading-none tracking-tight">{metric.value}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-70">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actividad Reciente</h4>
            <Badge variant="neutral">Live Feed</Badge>
          </div>
          
          <div className="space-y-3">
            {node.activities.length > 0 ? (
              node.activities.map((activity) => (
                <div key={activity.id} className="group relative rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:border-brand-200">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      activity.level === "ERROR" ? "bg-red-500 animate-pulse" : 
                      activity.level === "WARN" ? "bg-amber-500" : "bg-brand-500"
                    )} />
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium leading-relaxed text-slate-700">
                        {activity.message}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-200 px-6 py-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-3">
                   <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin registros recientes</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {node.href && (
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 space-y-4">
          <div className="flex items-center gap-3">
             <div className="flex-1 h-px bg-slate-200" />
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Navegación</span>
             <div className="flex-1 h-px bg-slate-200" />
          </div>
          <Link
            href={node.href}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 active:scale-95"
          >
            Abrir Módulo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="grid grid-cols-2 gap-3">
             <Link href="/platform/agents/logs" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors">
                Ver Logs
             </Link>
             <Link href="/platform/agents" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors">
                Dashboard
             </Link>
          </div>
        </div>
      )}
    </aside>
  );
}

function MobileCanvasList({ data }: { data: AgentCanvasData }) {
  const nodes = Object.values(data.nodes);

  return (
    <div className="grid gap-6 md:hidden p-4">
      {nodes.map((node) => (
        <article key={node.id} className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-brand-600">
                <NodeIcon id={node.id} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{node.type}</p>
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight">{node.title}</h3>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {node.metrics.map((metric) => (
                <div key={metric.label} className={cn("rounded-2xl border p-4", toneClasses[metric.tone ?? "neutral"])}>
                  <p className="text-2xl font-black tracking-tight leading-none">{metric.value}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-70">{metric.label}</p>
                </div>
              ))}
            </div>
            
            {node.href && (
              <Link href={node.href} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95">
                Ver detalle
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function AgentCanvas({ data }: { data: AgentCanvasData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasFlowNode>(buildNodes(data));
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string>("orchestrator");

  const selectedNode =
    nodes.find((node) => node.id === selectedId)?.data ??
    ({ ...data.nodes.orchestrator, variant: "agent" } satisfies CanvasNodeData);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedId(node.id);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="md:hidden overflow-auto">
        <MobileCanvasList data={data} />
      </div>

      <div className="hidden h-full overflow-hidden border-t border-slate-200 bg-white md:grid md:grid-cols-[minmax(0,1fr)_440px]">
        <div className="relative h-full bg-slate-50/50">
          <div className="absolute left-8 top-8 z-10 flex items-center gap-3 rounded-2xl border border-white bg-white/90 px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 shadow-xl shadow-slate-200/50 backdrop-blur">
            <RadioTower className="h-4 w-4 text-brand-600 animate-pulse" />
            Live Operation Center
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.35}
            maxZoom={1.4}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
            className="agentos-canvas"
          >
            <Background color="#cbd5e1" gap={24} size={1} />
            <Controls position="bottom-left" showInteractive={false} className="!border-none !shadow-none !bg-transparent" />
          </ReactFlow>
        </div>

        <div className="border-l border-slate-100 bg-slate-50/30 p-6 overflow-hidden">
          <DetailPanel node={selectedNode} />
        </div>
      </div>
    </div>
  );
}


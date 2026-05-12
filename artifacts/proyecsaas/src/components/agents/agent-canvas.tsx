"use client";

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
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
    default:
      return <Activity className={iconClass} />;
  }
}

function AgentCanvasCard({ data, selected }: NodeProps<CanvasFlowNode>) {
  return (
    <article
      className={cn(
        "w-[300px] rounded-2xl border bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition",
        selected ? "border-brand-400 ring-4 ring-brand-100" : "border-slate-200",
        data.variant === "agent" ? "bg-white" : "bg-slate-50/95",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-500" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <NodeIcon id={data.id} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold tracking-tight text-slate-950">{data.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{data.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {data.type}
        </span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-bold",
            statusClasses[data.status] ?? "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          {data.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.metrics.slice(0, 3).map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "rounded-xl border px-3 py-2",
              toneClasses[metric.tone ?? "neutral"],
            )}
          >
            <div className="text-lg font-black leading-none">{metric.value}</div>
            <div className="mt-1 text-[10px] font-bold leading-3">{metric.label}</div>
          </div>
        ))}
      </div>

      {data.activities[0] ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Última actividad</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{data.activities[0].message}</p>
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
      position: { x: 40, y: 190 },
      data: { ...data.nodes.orchestrator, variant: "agent" },
    },
    {
      id: "marketing",
      type: "agentCard",
      position: { x: 430, y: 60 },
      data: { ...data.nodes.marketing, variant: "agent" },
    },
    {
      id: "tasks",
      type: "agentCard",
      position: { x: 430, y: 340 },
      data: { ...data.nodes.tasks, variant: "workflow" },
    },
    {
      id: "drafts",
      type: "agentCard",
      position: { x: 820, y: 60 },
      data: { ...data.nodes.drafts, variant: "workflow" },
    },
    {
      id: "approvals",
      type: "agentCard",
      position: { x: 1210, y: 190 },
      data: { ...data.nodes.approvals, variant: "workflow" },
    },
    {
      id: "logs",
      type: "agentCard",
      position: { x: 820, y: 410 },
      data: { ...data.nodes.logs, variant: "activity" },
    },
  ];
}

const initialEdges: Edge[] = [
  {
    id: "orchestrator-marketing",
    source: "orchestrator",
    target: "marketing",
    label: "asigna",
  },
  {
    id: "orchestrator-tasks",
    source: "orchestrator",
    target: "tasks",
    label: "coordina",
  },
  {
    id: "marketing-drafts",
    source: "marketing",
    target: "drafts",
    label: "genera",
  },
  {
    id: "drafts-approvals",
    source: "drafts",
    target: "approvals",
    label: "solicita revisión",
  },
  {
    id: "approvals-logs",
    source: "approvals",
    target: "logs",
    label: "registra",
  },
].map((edge) => ({
  ...edge,
  type: "smoothstep",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#2563eb" },
  style: { stroke: "#2563eb", strokeWidth: 1.6 },
  labelStyle: { fill: "#64748b", fontSize: 11, fontWeight: 700 },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.86 },
}));

function DetailPanel({ node }: { node: CanvasNodeData }) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <NodeIcon id={node.id} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{node.type}</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{node.title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{node.description}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {node.metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn("rounded-xl border px-3 py-3", toneClasses[metric.tone ?? "neutral"])}
          >
            <p className="text-2xl font-black leading-none">{metric.value}</p>
            <p className="mt-1 text-xs font-bold">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 min-h-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Actividad relacionada</p>
        <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
          {node.activities.length > 0 ? (
            node.activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-slate-500">{activity.level}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{activity.message}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Sin actividad reciente para mostrar.
            </div>
          )}
        </div>
      </div>

      {node.href ? (
        <Link
          href={node.href}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Abrir vista relacionada
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </aside>
  );
}

function MobileCanvasList({ data }: { data: AgentCanvasData }) {
  const nodes = Object.values(data.nodes);

  return (
    <div className="grid gap-4 md:hidden">
      {nodes.map((node) => (
        <article key={node.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <NodeIcon id={node.id} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{node.type}</p>
              <h3 className="mt-1 text-base font-black text-slate-950">{node.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{node.subtitle}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {node.metrics.map((metric) => (
              <div key={metric.label} className={cn("rounded-xl border px-3 py-2", toneClasses[metric.tone ?? "neutral"])}>
                <p className="text-xl font-black">{metric.value}</p>
                <p className="text-xs font-bold">{metric.label}</p>
              </div>
            ))}
          </div>
          {node.href ? (
            <Link href={node.href} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
              Abrir vista
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AgentCanvas({ data }: { data: AgentCanvasData }) {
  const [nodes, , onNodesChange] = useNodesState<CanvasFlowNode>(buildNodes(data));
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const selectedNode =
    nodes.find((node) => node.selected)?.data ??
    ({ ...data.nodes.orchestrator, variant: "agent" } satisfies CanvasNodeData);

  return (
    <div className="flex h-full flex-col">
      <MobileCanvasList data={data} />

      <div className="hidden h-full overflow-hidden border-t border-slate-200 bg-white md:grid md:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative h-full bg-slate-50">
          <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-bold text-slate-500 shadow-sm backdrop-blur">
            <RadioTower className="h-4 w-4 text-brand-600" />
            Canvas operativo en vivo
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
            <Background color="#cbd5e1" gap={22} size={1} />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              nodeColor="#dbeafe"
              maskColor="rgba(15, 23, 42, 0.08)"
            />
          </ReactFlow>
        </div>

        <div className="border-l border-slate-200 bg-slate-50 p-4 overflow-auto">
          <DetailPanel node={selectedNode} />
        </div>
      </div>
    </div>
  );
}

import { 
  ProspectCompanyType, ProspectStatus, ProspectActivityType, 
  ProspectMessageChannel, ProspectDraftStatus,
  ManualRating, ProspectPriority, ManualProspectStatus,
  CampaignStatus, CampaignRecipientStatus, SuppressionReason,
  ProspectSourceType, DataValidationStatus
} from "@prisma/client";

export const PROSPECT_COMPANY_TYPE_LABELS: Record<ProspectCompanyType, string> = {
  REAL_ESTATE_AGENCY: "Inmobiliaria",
  CONSTRUCTION_COMPANY: "Constructora",
  DEVELOPER: "Desarrolladora",
  BROKER_AGENT: "Corredor / Martillero",
  PROPERTY_MANAGER: "Administradora de propiedades",
  LAND_DEVELOPER: "Comercializadora de loteos",
  REAL_ESTATE_GROUP: "Grupo real estate",
  ARCHITECTURE_STUDIO: "Estudio de arquitectura",
  REAL_ESTATE_INVESTOR: "Inversor inmobiliario",
  OTHER_REAL_ESTATE: "Otro rubro inmobiliario",
};

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "Nuevo",
  NEEDS_REVIEW: "Pendiente de revisar",
  APPROVED: "Aprobado",
  DISCARDED: "Descartado",
  DUPLICATE: "Duplicado",
  CONTACT_READY: "Listo para contacto",
  CONTACTED: "Contactado",
  REPLIED: "Respondió",
  DEMO_REQUESTED: "Solicitó demo",
  CUSTOMER: "Cliente actual",
  DO_NOT_CONTACT: "No contactar",
  CONVERTED: "Convertido a Organización",
  DEMO_HANDOFF_READY: "Listo para Demo",
  HANDED_TO_DEMO_AGENT: "Derivado a Demo",
};

export const PROSPECT_SOURCE_LABELS: Record<ProspectSourceType, string> = {
  MANUAL: "Manual",
  GOOGLE_PLACES: "Google Places",
  CSV: "CSV",
  WEB_SEARCH: "Web Search (Auto)",
  API: "API",
};

export const DATA_VALIDATION_LABELS: Record<DataValidationStatus, string> = {
  VALIDATED: "Validado",
  PENDING_ADDRESS: "Dirección a validar",
  PENDING_CITY: "Ciudad a validar",
  AMBIGUOUS: "Ambigüo",
};

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISCARDED: "bg-slate-100 text-slate-500 border-slate-200",
  DUPLICATE: "bg-slate-100 text-slate-400 border-slate-200",
  CONTACT_READY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CONTACTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REPLIED: "bg-purple-50 text-purple-700 border-purple-200",
  DEMO_REQUESTED: "bg-pink-50 text-pink-700 border-pink-200",
  CUSTOMER: "bg-slate-900 text-white border-slate-800",
  DO_NOT_CONTACT: "bg-red-50 text-red-700 border-red-200",
  CONVERTED: "bg-brand-600 text-white border-brand-700",
  DEMO_HANDOFF_READY: "bg-indigo-50 text-indigo-700 border-indigo-200",
  HANDED_TO_DEMO_AGENT: "bg-indigo-600 text-white border-indigo-700",
};

export const MANUAL_RATING_LABELS: Record<ManualRating, string> = {
  A: "A — Excelente",
  B: "B — Bueno",
  C: "C — Regular",
  D: "D — Bajo",
};

export const MANUAL_RATING_COLORS: Record<ManualRating, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-amber-100 text-amber-800 border-amber-300",
  D: "bg-red-100 text-red-800 border-red-300",
};

export const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const PRIORITY_COLORS: Record<ProspectPriority, string> = {
  HIGH: "bg-rose-100 text-rose-800 border-rose-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-slate-100 text-slate-600 border-slate-300",
};

export const MANUAL_STATUS_LABELS: Record<ManualProspectStatus, string> = {
  APTO_CONTACTO: "Apto para contacto",
  REVISAR: "Pendiente de revisión",
  DESCARTAR: "Descartado",
  NO_CONTACTAR: "No contactar",
  CONTACTAR_MAS_ADELANTE: "Contactar más adelante",
};

export const MANUAL_STATUS_COLORS: Record<ManualProspectStatus, string> = {
  APTO_CONTACTO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REVISAR: "bg-amber-50 text-amber-700 border-amber-200",
  DESCARTAR: "bg-slate-100 text-slate-500 border-slate-200",
  NO_CONTACTAR: "bg-red-50 text-red-700 border-red-200",
  CONTACTAR_MAS_ADELANTE: "bg-blue-50 text-blue-700 border-blue-200",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Borrador",
  READY: "Lista para enviar",
  SENDING: "Enviando...",
  SENT: "Enviada",
  PAUSED: "Pausada",
  FAILED: "Fallida",
  CANCELED: "Cancelada",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  READY: "bg-blue-50 text-blue-700 border-blue-200",
  SENDING: "bg-amber-50 text-amber-700 border-amber-200 animate-pulse",
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-slate-100 text-slate-500 border-slate-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  CANCELED: "bg-slate-200 text-slate-500 border-slate-300",
};

export const RECIPIENT_STATUS_LABELS: Record<CampaignRecipientStatus, string> = {
  PENDING: "Pendiente",
  SENT: "Enviado",
  FAILED: "Error",
  SKIPPED: "Omitido",
  BOUNCED: "Rebotado",
  UNSUBSCRIBED: "Baja",
};

export const RECIPIENT_STATUS_COLORS: Record<CampaignRecipientStatus, string> = {
  PENDING: "bg-slate-100 text-slate-500",
  SENT: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  SKIPPED: "bg-amber-50 text-amber-700",
  BOUNCED: "bg-red-100 text-red-800",
  UNSUBSCRIBED: "bg-slate-200 text-slate-600",
};

export type ProspectFilters = {
  search?: string;
  type?: ProspectCompanyType;
  status?: ProspectStatus;
  country?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWebsite?: boolean;
  isDoNotContact?: boolean;
  manualStatus?: ManualProspectStatus;
  priority?: ProspectPriority;
  manualRating?: ManualRating;
};

export type ProspectWithRelations = any; // Will be defined by Prisma includes

// ─── Score level helpers ─────────────────────────────────────────────────────

export function getScoreLevel(score: number | null | undefined): "alta" | "media" | "baja" {
  const s = score ?? 0;
  if (s >= 70) return "alta";
  if (s >= 40) return "media";
  return "baja";
}

export function getScoreLevelColor(level: "alta" | "media" | "baja"): string {
  if (level === "alta") return "text-emerald-600";
  if (level === "media") return "text-amber-600";
  return "text-red-500";
}

export function getScoreBadgeColor(level: "alta" | "media" | "baja"): string {
  if (level === "alta") return "bg-emerald-100 text-emerald-800";
  if (level === "media") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function getRiskLevel(score: number | null | undefined): "alto" | "medio" | "bajo" {
  const s = score ?? 0;
  if (s >= 50) return "alto";
  if (s >= 25) return "medio";
  return "bajo";
}

export function getRiskBadgeColor(level: "alto" | "medio" | "bajo"): string {
  if (level === "alto") return "bg-red-100 text-red-800";
  if (level === "medio") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

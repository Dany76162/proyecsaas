import { ProspectCompanyType, ProspectStatus, ProspectActivityType, ProspectMessageChannel, ProspectDraftStatus } from "@prisma/client";

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
};

export type ProspectWithRelations = any; // Will be defined by Prisma includes

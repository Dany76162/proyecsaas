import * as React from "react";
import { 
  X, 
  Map, 
  DollarSign, 
  Compass, 
  Calendar, 
  User, 
  Phone,
  Lock,
  Unlock,
  CheckCircle,
  FileText
} from "lucide-react";
import { LotStatus, LotStatusBadge } from "./lot-status-badge";
import { Button } from "@/components/ui/button";

export interface LotDetail {
  id: string;
  number: string;
  blockName: string;
  status: LotStatus;
  surfaceM2: number;
  priceUSD: number;
  orientation?: string;
  features?: string[];
  notes?: string;
  reservedBy?: {
    name: string;
    phone?: string;
    date?: string;
  };
}

export interface LotDetailPanelProps {
  lot: LotDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onReserve?: (lotId: string) => void;
  onContactAgent?: (lotId: string) => void;
  isAdmin?: boolean;
  onToggleBlockStatus?: (lotId: string, currentStatus: LotStatus) => void;
  className?: string;
}

export function LotDetailPanel({
  lot,
  isOpen,
  onClose,
  onReserve,
  onContactAgent,
  isAdmin = false,
  onToggleBlockStatus,
  className,
}: LotDetailPanelProps) {
  if (!isOpen || !lot) return null;

  const formattedPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(lot.priceUSD);

  const isAvailable = lot.status === "AVAILABLE";

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white border-l border-slate-100 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
            {lot.blockName}
          </span>
          <h2 className="text-lg font-bold text-slate-800">
            Lote {lot.number}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Status indicator card */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Estado de disponibilidad</span>
            <div>
              <LotStatusBadge status={lot.status} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Precio</span>
            <div className="text-lg font-bold text-emerald-600">
              {formattedPrice}
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Especificaciones Técnicas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-slate-100 rounded-lg flex items-center gap-3">
              <Map className="h-4 w-4 text-slate-400" />
              <div className="text-left">
                <p className="text-[11px] text-slate-400 leading-none">Superficie</p>
                <p className="text-sm font-semibold text-slate-700">{lot.surfaceM2} m²</p>
              </div>
            </div>
            {lot.orientation && (
              <div className="p-3 border border-slate-100 rounded-lg flex items-center gap-3">
                <Compass className="h-4 w-4 text-slate-400" />
                <div className="text-left">
                  <p className="text-[11px] text-slate-400 leading-none">Orientación</p>
                  <p className="text-sm font-semibold text-slate-700">{lot.orientation}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features / Amenities */}
        {lot.features && lot.features.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Características destacadas
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {lot.features.map((feature, i) => (
                <span key={i} className="text-xs bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1 text-slate-600 font-medium">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reservation / Buyer details (Visible to admin) */}
        {isAdmin && lot.reservedBy && (
          <div className="p-4 border border-amber-100 bg-amber-50/30 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Titular de Reserva</span>
            </h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nombre:</span>
                <span className="font-medium text-slate-700">{lot.reservedBy.name}</span>
              </div>
              {lot.reservedBy.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Teléfono:</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lot.reservedBy.phone}
                  </span>
                </div>
              )}
              {lot.reservedBy.date && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fecha:</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {lot.reservedBy.date}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {lot.notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Notas internas</span>
            </h3>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg leading-relaxed italic">
              "{lot.notes}"
            </p>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
        {isAvailable && onReserve && (
          <Button 
            onClick={() => onReserve(lot.id)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm h-10 rounded-lg"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            <span>Reservar Lote</span>
          </Button>
        )}

        {onContactAgent && (
          <Button 
            variant="outline"
            onClick={() => onContactAgent(lot.id)}
            className="w-full text-slate-700 bg-white border-slate-200 hover:bg-slate-50 h-10 rounded-lg"
          >
            <Phone className="mr-2 h-4 w-4 text-slate-400" />
            <span>Contactar Asesor / Consultar</span>
          </Button>
        )}

        {isAdmin && onToggleBlockStatus && (
          <Button 
            variant="ghost"
            onClick={() => onToggleBlockStatus(lot.id, lot.status)}
            className={`w-full mt-2 text-xs gap-1.5 h-8 hover:bg-slate-100 ${
              lot.status === "BLOCKED" ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"
            }`}
          >
            {lot.status === "BLOCKED" ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Desbloquear Lote (Habilitar)</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Bloquear temporalmente</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

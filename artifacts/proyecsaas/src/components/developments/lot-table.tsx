import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  Map,
  DollarSign,
  Eye,
  FileSpreadsheet,
  LandPlot
} from "lucide-react";
import { LotStatus, LotStatusBadge } from "./lot-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export interface LotRow {
  id: string;
  number: string;
  blockName: string;
  surfaceM2: number;
  priceUSD: number;
  status: LotStatus;
}

export interface LotTableProps {
  initialLots?: LotRow[];
  onSelectLot?: (lotId: string) => void;
  className?: string;
}

export function LotTable({
  initialLots = [],
  onSelectLot,
  className,
}: LotTableProps) {
  // State for search and filtering
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [minSurface, setMinSurface] = React.useState<string>("");
  const [maxPrice, setMaxPrice] = React.useState<string>("");

  // Filter lots based on state
  const filteredLots = React.useMemo(() => {
    return initialLots.filter((lot) => {
      // Search matches lot number or block
      const matchesSearch = 
        lot.number.toLowerCase().includes(search.toLowerCase()) ||
        lot.blockName.toLowerCase().includes(search.toLowerCase());

      // Status match
      const matchesStatus = statusFilter === "all" || lot.status === statusFilter;

      // Surface match
      const surfaceVal = parseFloat(minSurface);
      const matchesSurface = isNaN(surfaceVal) || lot.surfaceM2 >= surfaceVal;

      // Price match
      const priceVal = parseFloat(maxPrice);
      const matchesPrice = isNaN(priceVal) || lot.priceUSD <= priceVal;

      return matchesSearch && matchesStatus && matchesSurface && matchesPrice;
    });
  }, [initialLots, search, statusFilter, minSurface, maxPrice]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por lote o manzana..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-slate-700 bg-slate-50/50 border-slate-200 focus:bg-white"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="RESERVED">Reservado</option>
              <option value="SOLD">Vendido</option>
              <option value="BLOCKED">Bloqueado</option>
            </Select>
          </div>
        </div>

        {/* Advanced quick filters: Surface & Price */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50 text-xs">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500 mr-2">Filtros rápidos:</span>
          </div>

          {/* Min Surface */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Superficie Mín:</span>
            <div className="relative">
              <Input
                type="number"
                placeholder="400"
                value={minSurface}
                onChange={(e) => setMinSurface(e.target.value)}
                className="w-20 h-7 text-xs px-2 pr-6 py-0 border-slate-200"
              />
              <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400">m²</span>
            </div>
          </div>

          {/* Max Price */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Precio Máx:</span>
            <div className="relative">
              <Input
                type="number"
                placeholder="50000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 h-7 text-xs pl-5 pr-2 py-0 border-slate-200"
              />
              <DollarSign className="absolute left-1.5 top-2 h-3 w-3 text-slate-400" />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(search || statusFilter !== "all" || minSurface || maxPrice) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setMinSurface("");
                setMaxPrice("");
              }}
              className="text-brand-600 hover:text-brand-700 font-medium ml-auto"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Lot list table wrapper */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-500 text-xs py-3 w-[15%]">Lote</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs py-3 w-[20%]">Manzana</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs py-3 w-[20%] text-right">Superficie</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs py-3 w-[20%] text-right">Precio (USD)</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs py-3 w-[15%] text-center">Estado</TableHead>
                <TableHead className="w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                      {initialLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <LandPlot className="h-8 w-8 text-slate-200" />
                      <p className="text-sm font-semibold text-slate-400">Todavía no hay lotes cargados para este desarrollo.</p>
                      <p className="text-xs text-slate-400">Cargá o sincronizá el plano para generar el inventario.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLots.length > 0 ? (
                filteredLots.map((lot) => {
                  const formattedPrice = new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(lot.priceUSD);

                  return (
                    <TableRow
                      key={lot.id}
                      className="border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectLot?.(lot.id)}
                    >
                      <TableCell className="font-bold text-slate-700 text-sm py-3.5">
                        {lot.number}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs py-3.5">
                        {lot.blockName}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 font-medium text-xs py-3.5">
                        {lot.surfaceM2} m²
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 text-sm py-3.5">
                        {formattedPrice}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <LotStatusBadge status={lot.status} />
                      </TableCell>
                      <TableCell className="text-right pr-4 py-3.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 group-hover:text-brand-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLot?.(lot.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                    No se encontraron lotes que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table summary stats footer */}
        <div className="flex items-center justify-between p-3 border-t border-slate-50 bg-slate-50/50 text-[11px] text-slate-400">
          <div className="flex gap-2.5">
            <span>Total: <strong>{initialLots.length} lotes</strong></span>
            <span>Filtrados: <strong>{filteredLots.length} lotes</strong></span>
          </div>
          <div>
            <span>* Todos los precios en dólares estadounidenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

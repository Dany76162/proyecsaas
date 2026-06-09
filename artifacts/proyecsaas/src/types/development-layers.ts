export const DRAWABLE_LAYER_TYPES = [
  "CALLE",
  "AREA_VERDE",
  "PERIMETRO",
  "POLIGONO_LIBRE",
] as const;

export type DrawableLayerTipo = (typeof DRAWABLE_LAYER_TYPES)[number];

export interface DevelopmentDrawableLayerDto {
  id: string;
  developmentId: string;
  nombre: string;
  tipo: DrawableLayerTipo;
  orden: number;
  visible: boolean;
  bloqueada: boolean;
  geometria: unknown | null;
  colorRelleno: string | null;
  colorBorde: string | null;
  opacidad: number | null;
  grosorBorde: number | null;
  creadoEn?: string;
  actualizadoEn?: string;
}

export const DRAWABLE_LAYER_LABELS: Record<DrawableLayerTipo, string> = {
  CALLE: "Calle",
  AREA_VERDE: "Área verde",
  PERIMETRO: "Perímetro",
  POLIGONO_LIBRE: "Polígono libre",
};

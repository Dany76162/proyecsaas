import type {
  CreateDevelopmentVisualObjectInput,
  DevelopmentVisualObjectDto,
  VisualObjectGeometry,
  VisualRectGeometry,
  VisualCircleGeometry,
  VisualTextGeometry,
  VisualPathGeometry,
} from "@/types/development-visual-objects";
import type { CadShape, CadShapeType } from "./visual-cad-types";

/**
 * Converte una forma geométrica del editor CAD (CadShape) en el payload
 * requerido para el backend (CreateDevelopmentVisualObjectInput).
 */
export function cadShapeToVisualObjectInput(
  shape: CadShape,
  developmentId: string
): CreateDevelopmentVisualObjectInput {
  let geometry: VisualObjectGeometry;
  let geometryKind: "RECT" | "CIRCLE" | "POLYLINE" | "TEXT";

  switch (shape.type) {
    case "RECT":
      geometryKind = "RECT";
      geometry = {
        x: shape.x,
        y: shape.y,
        width: shape.width ?? 100,
        height: shape.height ?? 100,
      } as VisualRectGeometry;
      break;

    case "CIRCLE":
      geometryKind = "CIRCLE";
      geometry = {
        cx: shape.x,
        cy: shape.y,
        r: shape.radius ?? 50,
      } as VisualCircleGeometry;
      break;

    case "LINE":
      geometryKind = "POLYLINE";
      const pts = shape.points ?? [shape.x, shape.y, shape.x + 100, shape.y + 100];
      geometry = {
        points: [
          { x: pts[0], y: pts[1] },
          { x: pts[2], y: pts[3] },
        ],
      } as VisualPathGeometry;
      break;

    case "TEXT":
      geometryKind = "TEXT";
      geometry = {
        x: shape.x,
        y: shape.y,
        text: shape.text ?? "Texto",
        fontSize: shape.fontSize ?? 14,
      } as VisualTextGeometry;
      break;

    default:
      throw new Error(`Unsupported shape type: ${shape.type}`);
  }

  return {
    name: shape.label ?? `Objeto ${shape.type.toLowerCase()}`,
    type: shape.layer ?? "custom",
    geometryKind,
    geometry,
    fillColor: shape.fillColor ?? null,
    strokeColor: shape.strokeColor ?? null,
    opacity: 0.5,
    strokeWidth: shape.strokeWidth ?? 2,
    zIndex: 1,
    visibility: "BOTH",
    interactive: true,
    locked: false,
  };
}

/**
 * Convierte un objeto de la base de datos (DevelopmentVisualObjectDto)
 * en el formato interno del editor CAD (CadShape).
 */
export function visualObjectToCadShape(obj: DevelopmentVisualObjectDto): CadShape {
  const shape: CadShape = {
    id: obj.id,
    type: "RECT", // Default placeholder
    x: 0,
    y: 0,
    fillColor: obj.fillColor ?? undefined,
    strokeColor: obj.strokeColor ?? undefined,
    strokeWidth: obj.strokeWidth ?? undefined,
    label: obj.name,
    layer: obj.type,
  };

  if (obj.geometryKind === "RECT") {
    const geom = obj.geometry as VisualRectGeometry;
    shape.type = "RECT";
    shape.x = geom.x;
    shape.y = geom.y;
    shape.width = geom.width;
    shape.height = geom.height;
  } else if (obj.geometryKind === "CIRCLE") {
    const geom = obj.geometry as VisualCircleGeometry;
    shape.type = "CIRCLE";
    shape.x = geom.cx;
    shape.y = geom.cy;
    shape.radius = geom.r;
  } else if (obj.geometryKind === "POLYLINE" || obj.geometryKind === "POLYGON") {
    const geom = obj.geometry as VisualPathGeometry;
    shape.type = "LINE";
    if (geom.points && geom.points.length >= 2) {
      shape.x = geom.points[0].x;
      shape.y = geom.points[0].y;
      shape.points = [
        geom.points[0].x,
        geom.points[0].y,
        geom.points[1].x,
        geom.points[1].y,
      ];
    } else {
      shape.x = 0;
      shape.y = 0;
      shape.points = [0, 0, 100, 100];
    }
  } else if (obj.geometryKind === "TEXT") {
    const geom = obj.geometry as VisualTextGeometry;
    shape.type = "TEXT";
    shape.x = geom.x;
    shape.y = geom.y;
    shape.text = geom.text;
    shape.fontSize = geom.fontSize ?? 14;
  }

  return shape;
}

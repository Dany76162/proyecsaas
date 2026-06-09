import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage-seven";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId") as string | undefined;

    if (!(file instanceof File) || !projectId) {
      return NextResponse.json(
        { success: false, error: "Archivo o projectId inválido" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el máximo permitido de 15MB" },
        { status: 413 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const isDxf = file.name.toLowerCase().endsWith(".dxf");

    if (!ALLOWED_MIME_TYPES.has(mimeType) && !isDxf) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tipo de archivo no permitido. Se aceptan imágenes (JPG, PNG, WEBP, GIF, SVG), PDF y DXF.",
        },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadFile({
      folder: `developments/${projectId}/map-images`,
      filename: file.name,
      contentType: mimeType,
      buffer,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
    });
  } catch (error: any) {
    console.error("[api/upload] Error uploading image:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al subir la imagen" },
      { status: 500 }
    );
  }
}

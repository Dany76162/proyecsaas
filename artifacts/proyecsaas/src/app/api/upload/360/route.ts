import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage-seven";

const MAX_360_SIZE = 512 * 1024 * 1024; // 512MB for panoramas

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

    if (file.size <= 0 || file.size > MAX_360_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo supera el máximo permitido para panorámicas` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to R2
    const uploadResult = await uploadFile({
      folder: `developments/${projectId}/panoramas`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      buffer,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
    });
  } catch (error: any) {
    console.error("[api/upload/360] Error uploading panorama:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al subir la panorámica" },
      { status: 500 }
    );
  }
}

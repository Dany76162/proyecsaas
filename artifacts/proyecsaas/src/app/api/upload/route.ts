import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage-seven";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB

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

    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo supera el máximo permitido de 15MB` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to R2 (or any other storage you use via uploadFile)
    const uploadResult = await uploadFile({
      folder: `developments/${projectId}/map-images`,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
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

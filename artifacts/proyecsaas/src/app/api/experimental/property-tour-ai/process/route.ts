import { MembershipRole } from "@prisma/client";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_VIDEO_SIZE = 180 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 6 * 60 * 1000;
const ALLOWED_VIDEO_TYPES = new Set(["video/webm", "video/mp4", "video/quicktime"]);
const EXPERIMENT_ROOT = join(process.cwd(), "experiments", "video-to-panorama");
const RUNTIME_ROOT = join(EXPERIMENT_ROOT, "runtime");

function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

function inferContentType(filename: string, contentType: string) {
  if (contentType && contentType !== "application/octet-stream") return contentType.split(";")[0] ?? contentType;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov" || ext === "qt") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return contentType;
}

function extensionFor(filename: string, contentType: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ["webm", "mp4", "mov"].includes(ext)) return ext;
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/quicktime") return "mov";
  return "webm";
}

function runProcessor(inputPath: string, outputPath: string) {
  const pythonBinary = process.env.VIDEO_TO_PANORAMA_PYTHON || "python";
  const scriptPath = join(EXPERIMENT_ROOT, "process_video.py");

  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(
      pythonBinary,
      [scriptPath, "--input", inputPath, "--output", outputPath],
      {
        cwd: EXPERIMENT_ROOT,
        windowsHide: true,
      },
    );

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("El procesamiento local supero el tiempo maximo permitido."));
    }, PROCESS_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode });
    });
  });
}

function fileUrl(req: Request, jobId: string, file: string) {
  const url = new URL(req.url);
  return `${url.origin}/api/experimental/property-tour-ai/file?jobId=${encodeURIComponent(jobId)}&file=${encodeURIComponent(file)}`;
}

export async function POST(req: Request) {
  if (!FEATURE_FLAGS.enableExperimentalAiTourGenerator) {
    return jsonError("El generador experimental de tour 360 con IA no esta habilitado.", 404);
  }

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError("No se pudo leer el video enviado.", 413);
    }

    const file = formData.get("file");
    const orgSlug = String(formData.get("orgSlug") ?? "");
    const propertyId = String(formData.get("propertyId") ?? "");

    if (!(file instanceof File)) return jsonError("Archivo invalido.");
    if (!orgSlug || !propertyId) return jsonError("Parametros de procesamiento invalidos.");
    if (file.size <= 0 || file.size > MAX_VIDEO_SIZE) {
      return jsonError("El video supera el maximo permitido de 180 MB.", 413);
    }

    const contentType = inferContentType(file.name, file.type);
    if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
      return jsonError("Formato de video no permitido. Usa WebM, MP4 o QuickTime.");
    }

    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, MembershipRole.AGENT);

    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId: membership.organization.id },
      select: { id: true },
    });
    if (!property) return jsonError("La propiedad no existe o no pertenece a tu organizacion.", 404);

    const scriptPath = join(EXPERIMENT_ROOT, "process_video.py");
    if (!existsSync(scriptPath)) {
      return jsonError("El procesador local no esta disponible. Verifica Python, FFmpeg y dependencias.", 503);
    }

    const jobId = crypto.randomUUID();
    const jobDir = join(RUNTIME_ROOT, jobId);
    const inputDir = join(jobDir, "input");
    const outputDir = join(jobDir, "output");
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const extension = extensionFor(file.name, contentType);
    const inputPath = join(inputDir, `source.${extension}`);
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const processResult = await runProcessor(inputPath, outputDir);
    const reportPath = join(outputDir, "report.json");
    let report: any = null;
    try {
      report = JSON.parse(await readFile(reportPath, "utf-8"));
    } catch {
      return jsonError("El procesador local no genero un reporte valido.", 500);
    }

    const visualQuality = report.visual_quality ?? {};
    const hasPanorama = existsSync(join(outputDir, "panorama.jpg"));
    const hasCropped = existsSync(join(outputDir, "panorama_cropped.jpg"));
    const hasPreview = existsSync(join(outputDir, "preview.jpg"));
    const hasPreviewCropped = existsSync(join(outputDir, "preview_cropped.jpg"));

    return NextResponse.json({
      success: true,
      jobId,
      recommendation: report.recommendation ?? "NO APTO",
      quality_score: visualQuality.quality_score ?? null,
      black_area_percent: visualQuality.black_area_percent ?? null,
      border_black_percent: visualQuality.border_black_percent ?? null,
      quality_warnings: visualQuality.quality_warnings ?? [],
      warnings: report.warnings ?? [],
      frames_extracted: report.frames_extracted ?? null,
      frames_selected: report.frames_selected ?? null,
      stitching_success: report.stitching?.success ?? false,
      processor: {
        exitCode: processResult.exitCode,
        stdout: processResult.stdout.slice(-2000),
        stderr: processResult.stderr.slice(-2000),
      },
      urls: {
        panorama: hasPanorama ? fileUrl(req, jobId, "panorama.jpg") : null,
        panorama_cropped: hasCropped ? fileUrl(req, jobId, "panorama_cropped.jpg") : null,
        preview: hasPreview ? fileUrl(req, jobId, "preview.jpg") : null,
        preview_cropped: hasPreviewCropped ? fileUrl(req, jobId, "preview_cropped.jpg") : null,
        report: fileUrl(req, jobId, "report.md"),
      },
    });
  } catch (error: any) {
    console.error("[experimental/property-tour-ai/process]", error);
    return jsonError(
      error?.message?.includes("ENOENT")
        ? "El procesador local no esta disponible. Verifica Python, FFmpeg y dependencias."
        : error?.message || "No se pudo procesar el tour 360 con IA.",
      500,
    );
  }
}


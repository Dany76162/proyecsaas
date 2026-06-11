import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPERIMENT_ROOT = join(process.cwd(), "experiments", "video-to-panorama");
const RUNTIME_ROOT = join(EXPERIMENT_ROOT, "runtime");
const ALLOWED_FILES = new Set([
  "panorama.jpg",
  "panorama_cropped.jpg",
  "panorama_recommended.jpg",
  "preview.jpg",
  "preview_cropped.jpg",
  "preview_recommended.jpg",
  "report.md",
]);

function isSafeJobId(value: string) {
  return /^[a-zA-Z0-9_-]{8,80}$/.test(value);
}

function contentTypeFor(filename: string) {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId") ?? "";
  const file = url.searchParams.get("file") ?? "";

  if (!isSafeJobId(jobId) || !ALLOWED_FILES.has(file)) {
    return NextResponse.json({ success: false, error: "Archivo experimental invalido." }, { status: 400 });
  }

  const jobOutputDir = normalize(join(RUNTIME_ROOT, jobId, "output"));
  const targetPath = normalize(join(jobOutputDir, file));
  if (!targetPath.startsWith(jobOutputDir) || !existsSync(targetPath)) {
    return NextResponse.json({ success: false, error: "Archivo experimental no encontrado." }, { status: 404 });
  }

  const fileStat = await stat(targetPath);
  const stream = Readable.toWeb(createReadStream(targetPath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": contentTypeFor(file),
      "Content-Length": String(fileStat.size),
      "Cache-Control": "no-store",
    },
  });
}

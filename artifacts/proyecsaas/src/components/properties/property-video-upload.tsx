"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import { setPropertyVideoAction } from "@/modules/properties/actions";

interface PropertyVideoUploadProps {
  orgSlug: string;
  propertyId: string;
  videoUrl: string | null;
}

type VideoKind = "uploaded" | "youtube" | "vimeo" | "drive" | "external";

function detectKind(url: string): VideoKind {
  if (url.includes("utfs.io") || url.includes("cloudinary.com")) return "uploaded";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/vimeo\.com\/\d/.test(url)) return "vimeo";
  if (/drive\.google\.com/.test(url)) return "drive";
  return "external";
}

function getEmbedUrl(url: string, kind: VideoKind): string | null {
  if (kind === "youtube") {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  if (kind === "vimeo") {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  if (kind === "drive") {
    const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  }
  return null;
}

function KindBadge({ kind }: { kind: VideoKind }) {
  const labels: Record<VideoKind, string> = {
    uploaded: "Video subido",
    youtube: "YouTube",
    vimeo: "Vimeo",
    drive: "Google Drive",
    external: "Enlace externo",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {labels[kind]}
    </span>
  );
}

export function PropertyVideoUpload({
  orgSlug,
  propertyId,
  videoUrl,
}: PropertyVideoUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const kind = videoUrl ? detectKind(videoUrl) : null;
  const embedUrl = videoUrl && kind ? getEmbedUrl(videoUrl, kind) : null;

  async function handleUploadSuccess(result: any) {
    if (result.event === "success") {
      const info = result.info;
      setError(null);
      const res = await setPropertyVideoAction(orgSlug, {
        propertyId,
        url: info.secure_url,
      });
      if (res.success) {
        router.refresh();
      } else {
        setError(res.message ?? "Error al guardar el video.");
      }
    }
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await setPropertyVideoAction(orgSlug, { propertyId, url: null });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.message ?? "Error al eliminar el video.");
      }
    });
  }

  const isBusy = isPending;

  return (
    <div className="space-y-4">
      {/* â”€â”€ Current video display â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {videoUrl && kind ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KindBadge kind={kind} />
          </div>

          {kind === "uploaded" ? (
            // HTML5 native player for UploadThing CDN videos
            <div className="overflow-hidden rounded-2xl bg-slate-950">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[420px]"
              />
            </div>
          ) : embedUrl ? (
            // Iframe embed for YouTube / Vimeo / Drive
            <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                title="Video tour"
              />
            </div>
          ) : (
            // Generic external link
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-slate-50"
            >
              Ver video externo →
            </a>
          )}

          {/* Actions row */}
          <div className="flex flex-wrap gap-2">
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              onSuccess={handleUploadSuccess}
              options={{
                resourceType: "video",
                clientAllowedFormats: ["mp4", "mov", "webm"],
                maxFileSize: 100000000, // 100MB approx (Cloudinary free tier limit for unsigned)
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => open()}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Reemplazar video
                </button>
              )}
            </CldUploadWidget>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDelete}
              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              {isPending ? "Eliminandoâ€¦" : "Eliminar video"}
            </button>
          </div>
        </div>
      ) : (
        /* â”€â”€ No video yet â€” upload zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        <div className="space-y-3">
          <CldUploadWidget
            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
            onSuccess={handleUploadSuccess}
            options={{
              resourceType: "video",
              clientAllowedFormats: ["mp4", "mov", "webm"],
              maxFileSize: 100000000, // 100MB
            }}
          >
            {({ open }) => (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => open()}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 8.25v9A2.25 2.25 0 004.5 18.75z" />
                </svg>
                <span className="text-sm font-medium text-slate-600">
                  Hacé click para subir un video
                </span>
                <span className="text-xs text-slate-400">
                  MP4 Â· MOV Â· WebM Â· máx. 100 MB
                </span>
              </button>
            )}
          </CldUploadWidget>
          <p className="text-xs text-slate-400">
            Para videos más pesados, subílos a YouTube o Vimeo y pegá el link en el campo
            "Video / Tour virtual" de la sección Descripción.
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

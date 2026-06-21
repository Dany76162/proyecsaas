import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, getR2Client } from "@/lib/storage/r2";
import { promises as fs } from "node:fs";
import path, { join } from "node:path";

export const dynamic = "force-dynamic";

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");
    const urlParam = searchParams.get("url");
    const widthParam = searchParams.get("w");
    const qualityParam = searchParams.get("q");

    if (!keyParam && !urlParam) {
      return new Response("Missing key or url parameter", { status: 400 });
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");

    let buffer: Buffer | null = null;
    let contentType = "application/octet-stream";
    let cacheControl = "public, max-age=31536000, immutable";

    if (urlParam) {
      if (urlParam.startsWith("/")) {
        const normalized = path.normalize(urlParam);
        const publicDir = join(process.cwd(), "public");
        const localPath = join(publicDir, normalized);

        if (!localPath.startsWith(publicDir)) {
          return new Response("Forbidden", { status: 403 });
        }

        try {
          const ext = normalized.split(".").pop()?.toLowerCase();
          contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/jpeg";

          if (widthParam) {
            buffer = await fs.readFile(localPath);
          } else {
            const fileBuffer = await fs.readFile(localPath);
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", cacheControl);
            return new NextResponse(fileBuffer as any, { headers });
          }
        } catch {
          return new Response("File not found", { status: 404 });
        }
      } else {
        const sourceUrl = new URL(urlParam);
        const configuredPublicUrl = process.env.STORAGE_PUBLIC_URL ? new URL(process.env.STORAGE_PUBLIC_URL) : null;
        
        const requestHost = (req.headers.get("host") || "").split(":")[0];
        const isSameOrigin =
          sourceUrl.hostname === requestHost ||
          sourceUrl.hostname === "localhost" ||
          sourceUrl.hostname === "127.0.0.1";

        if (isSameOrigin && sourceUrl.pathname.startsWith("/uploads/")) {
          // Si es del mismo origen y apunta a /uploads/, leemos el archivo directamente de disco
          // para evitar hacer una petición HTTP a nosotros mismos (evita deadlocks/timeouts).
          const normalized = path.normalize(sourceUrl.pathname);
          const publicDir = join(process.cwd(), "public");
          const localPath = join(publicDir, normalized);

          if (!localPath.startsWith(publicDir)) {
            return new Response("Forbidden", { status: 403 });
          }

          try {
            const ext = normalized.split(".").pop()?.toLowerCase();
            contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/jpeg";

            if (widthParam) {
              buffer = await fs.readFile(localPath);
            } else {
              const fileBuffer = await fs.readFile(localPath);
              headers.set("Content-Type", contentType);
              headers.set("Cache-Control", cacheControl);
              return new Response(fileBuffer, { headers });
            }
          } catch {
            return new Response("File not found", { status: 404 });
          }
        } else {
          // Allow any HTTPS external URL to be proxied for panoramas
          // as we use various providers (R2, Cloudinary, Unsplash, Pannellum examples)
          const isAllowedHost = sourceUrl.protocol === "https:";

          if (!isAllowedHost) {
            return new Response("URL host is not allowed (must be https)", { status: 400 });
          }

          const upstream = await fetch(sourceUrl.toString(), {
            headers: { Accept: "image/*,*/*;q=0.8" },
            cache: "force-cache",
          });

          if (!upstream.ok) {
            return new Response("File not found", { status: upstream.status || 404 });
          }

          contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";
          
          if (widthParam) {
            const arrayBuffer = await upstream.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          } else {
            if (!upstream.body) {
              return new Response("File body is empty", { status: 404 });
            }
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", cacheControl);
            return new Response(upstream.body, { headers });
          }
        }
      }
    } else {
      if (!isR2Configured()) {
        return new Response("R2 storage is not configured", { status: 503 });
      }

      const client = getR2Client();
      const bucketName = process.env.STORAGE_BUCKET_NAME!;

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: keyParam!,
      });

      const response = await client.send(command);
      
      contentType = response.ContentType ?? "application/octet-stream";
      if (response.CacheControl) {
        cacheControl = response.CacheControl;
      }

      const stream = response.Body;
      if (!stream) {
        return new Response("File body is empty", { status: 404 });
      }

      if (widthParam) {
        buffer = await streamToBuffer(stream);
      } else {
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", cacheControl);
        return new Response(stream as any, { headers });
      }
    }

    // Perform resizing if widthParam is present and we have the buffer
    if (buffer && widthParam) {
      try {
        const width = parseInt(widthParam, 10);
        const quality = qualityParam ? parseInt(qualityParam, 10) : 80;

        if (!isNaN(width) && width > 0) {
          const sharp = (await import("sharp")).default;
          // limitInputPixels: false permits processing very large images (like 8K panoramas)
          const optimizedBuffer = await sharp(buffer, { limitInputPixels: false })
            .resize({ width })
            .jpeg({ quality })
            .toBuffer();

          headers.set("Content-Type", "image/jpeg");
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          return new Response(optimizedBuffer, { headers });
        }
      } catch (resizeError) {
        console.error("[api/storage/view] Error optimizing image with sharp:", resizeError);
        // Fallback to sending original buffer
      }
    }

    // Fallback if resizing failed or was skipped
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", cacheControl);
    return new Response(buffer, { headers });

  } catch (error: any) {
    console.error("[api/storage/view] Error streaming file:", error);
    
    if (error.name === "NoSuchKey") {
      return new Response("File not found", { status: 404 });
    }
    
    return new Response(error.message || "Error reading file", { status: 500 });
  }
}

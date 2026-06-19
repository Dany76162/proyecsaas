import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, getR2Client } from "@/lib/storage/r2";

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
      const sourceUrl = new URL(urlParam);
      const configuredPublicUrl = process.env.STORAGE_PUBLIC_URL ? new URL(process.env.STORAGE_PUBLIC_URL) : null;
      const isAllowedR2Host =
        sourceUrl.protocol === "https:" &&
        (sourceUrl.hostname.endsWith(".r2.dev") ||
          (configuredPublicUrl && sourceUrl.hostname === configuredPublicUrl.hostname));

      if (!isAllowedR2Host) {
        return new Response("URL host is not allowed", { status: 400 });
      }

      const upstream = await fetch(sourceUrl.toString(), {
        headers: { Accept: "image/*,*/*;q=0.8" },
        cache: "force-cache",
      });

      if (!upstream.ok) {
        return new Response("File not found", { status: upstream.status || 404 });
      }

      contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";
      
      // If resizing is requested, load the body into a buffer.
      // Otherwise, return the body stream directly for performance.
      if (widthParam) {
        const arrayBuffer = await upstream.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        if (!upstream.body) {
          return new Response("File body is empty", { status: 404 });
        }
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", cacheControl);
        return new NextResponse(upstream.body, { headers });
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
        return new NextResponse(stream as any, { headers });
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
          return new NextResponse(optimizedBuffer as any, { headers });
        }
      } catch (resizeError) {
        console.error("[api/storage/view] Error optimizing image with sharp:", resizeError);
        // Fallback to sending original buffer
      }
    }

    // Fallback if resizing failed or was skipped
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", cacheControl);
    return new NextResponse(buffer as any, { headers });

  } catch (error: any) {
    console.error("[api/storage/view] Error streaming file:", error);
    
    if (error.name === "NoSuchKey") {
      return new Response("File not found", { status: 404 });
    }
    
    return new Response(error.message || "Error reading file", { status: 500 });
  }
}

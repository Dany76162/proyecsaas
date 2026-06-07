import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, getR2Client } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get("key");
    const urlParam = searchParams.get("url");

    if (!keyParam && !urlParam) {
      return new Response("Missing key or url parameter", { status: 400 });
    }

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

      if (!upstream.ok || !upstream.body) {
        return new Response("File not found", { status: upstream.status || 404 });
      }

      const headers = new Headers();
      headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/octet-stream");
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Access-Control-Allow-Origin", "*");

      return new NextResponse(upstream.body, { headers });
    }

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
    
    // Read the stream into a ReadableStream for Next.js response
    const stream = response.Body;
    if (!stream) {
      return new Response("File body is empty", { status: 404 });
    }

    const headers = new Headers();
    if (response.ContentType) {
      headers.set("Content-Type", response.ContentType);
    } else {
      headers.set("Content-Type", "application/octet-stream");
    }
    
    if (response.CacheControl) {
      headers.set("Cache-Control", response.CacheControl);
    } else {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }
    headers.set("Access-Control-Allow-Origin", "*");

    // Return the response streaming the data
    return new NextResponse(stream as any, { headers });
  } catch (error: any) {
    console.error("[api/storage/view] Error streaming file from R2:", error);
    
    if (error.name === "NoSuchKey") {
      return new Response("File not found", { status: 404 });
    }
    
    return new Response(error.message || "Error reading file", { status: 500 });
  }
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * S3-compatible storage client.
 * Works with AWS S3, Cloudflare R2, MinIO, etc.
 *
 * Required env vars:
 *   STORAGE_ACCESS_KEY_ID
 *   STORAGE_SECRET_ACCESS_KEY
 *   STORAGE_BUCKET_NAME
 *
 * Optional env vars:
 *   STORAGE_REGION        — defaults to "auto" (required for R2)
 *   STORAGE_ENDPOINT      — set for R2 or custom S3-compatible endpoints
 *   STORAGE_PUBLIC_URL    — CDN URL prefix (e.g., https://pub-xxx.r2.dev)
 */

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: !!process.env.STORAGE_ENDPOINT,
  });
}

let _s3: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = createS3Client();
  }
  return _s3;
}

/**
 * Uploads a file to S3-compatible storage and returns its public URL.
 */
export async function uploadToStorage(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const s3 = getS3Client();
  const bucket = process.env.STORAGE_BUCKET_NAME!;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  const baseUrl =
    process.env.STORAGE_PUBLIC_URL ??
    `https://${bucket}.s3.${process.env.STORAGE_REGION ?? "auto"}.amazonaws.com`;

  return `${baseUrl}/${params.key}`;
}

/**
 * Returns true if the S3 storage environment variables are configured.
 * When false, the upload endpoint falls back to local filesystem storage.
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY &&
    process.env.STORAGE_BUCKET_NAME
  );
}

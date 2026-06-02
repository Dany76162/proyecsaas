import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
const bucketName = process.env.STORAGE_BUCKET_NAME;
const endpoint = process.env.STORAGE_ENDPOINT; // e.g. https://<accountId>.r2.cloudflarestorage.com
const publicBaseUrl = process.env.STORAGE_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

export function isR2Configured(): boolean {
  return !!(accessKeyId && secretAccessKey && bucketName && endpoint);
}

export function getR2Client() {
  if (!isR2Configured()) {
    throw new Error("El storage Cloudflare R2 no está configurado. Revisá las variables de entorno STORAGE_*");
  }

  return new S3Client({
    region: "auto",
    endpoint: endpoint!,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

export async function generateR2PresignedUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getR2Client();
  const bucket = bucketName!;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // CacheControl omitido: incluirlo causa que el preflight CORS requiera
    // Cache-Control en AllowedHeaders. Sin él el PUT solo necesita Content-Type.
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  
  // Construct public URL
  const base = publicBaseUrl ? publicBaseUrl.replace(/\/$/, "") : `${endpoint!.replace(/\/$/, "")}/${bucket}`;
  const publicUrl = `${base}/${key}`;

  return { uploadUrl, publicUrl };
}

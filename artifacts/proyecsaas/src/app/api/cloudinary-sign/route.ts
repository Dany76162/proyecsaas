import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

/**
 * Genera la firma requerida por Cloudinary para uploads firmados.
 * Equivalente a cloudinary.utils.api_sign_request() pero sin la librería.
 * Spec: SHA1( sorted_params_string + api_secret )
 */
function signCloudinaryRequest(params: Record<string, string | number>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  return createHash('sha1')
    .update(sorted + apiSecret)
    .digest('hex')
}

export async function POST(req: Request) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json(
      { error: 'Cloudinary no configurado en el servidor.' },
      { status: 500 },
    )
  }

  const { folder } = await req.json()
  const timestamp = Math.round(Date.now() / 1000)
  const paramsToSign: Record<string, string | number> = { folder, timestamp }

  const signature = signCloudinaryRequest(paramsToSign, apiSecret)

  return NextResponse.json({ signature, timestamp, apiKey, cloudName })
}

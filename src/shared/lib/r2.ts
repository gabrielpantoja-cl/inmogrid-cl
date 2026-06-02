import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!client) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2 config missing: set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
      );
    }
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

export function r2PublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_IMAGES_URL?.replace(/\/$/, '');
  if (!base) throw new Error('NEXT_PUBLIC_R2_IMAGES_URL is not set');
  return `${base}/${key}`;
}

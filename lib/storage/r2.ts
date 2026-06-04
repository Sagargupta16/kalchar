/**
 * Cloudflare R2 client for artwork image uploads (Phase 2 admin).
 *
 * R2 is S3-API-compatible, so we use the AWS S3 SDK pointed at the R2 endpoint.
 * R2 has no egress fees, which is why it's preferred over S3 for serving a
 * public image catalog.
 *
 * Server-only -- holds the R2 access keys. Called from admin server actions /
 * the migration script, never from a client component.
 *
 * The public URL of an uploaded object is `${R2_PUBLIC_BASE_URL}/${key}`. That
 * base feeds art-image.tsx's <picture> srcset; the variant-generation step
 * (sharp -> -400/-800/-1200/-1600 .avif/.webp/.jpg) writes sibling keys under
 * the same prefix, preserving the existing filename contract.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const BUCKET = process.env.R2_BUCKET ?? "kalchar-artworks";
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL ?? "";

if (!accountId || !accessKeyId || !secretAccessKey) {
	throw new Error("R2 credentials are not set. See docs/PHASE-2-SETUP.md Part 1.");
}

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
	credentials: { accessKeyId, secretAccessKey },
});

/** Upload one object and return its public URL. */
export async function uploadObject(
	key: string,
	body: Uint8Array | Buffer,
	contentType: string,
): Promise<string> {
	await r2.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
	return `${PUBLIC_BASE_URL}/${key}`;
}

export const r2Config = { bucket: BUCKET, publicBaseUrl: PUBLIC_BASE_URL };

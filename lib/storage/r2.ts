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
import {
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env";

const BUCKET = serverEnv.r2Bucket;
const PUBLIC_BASE_URL = serverEnv.r2PublicBaseUrl;

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: serverEnv.r2AccessKeyId,
		secretAccessKey: serverEnv.r2SecretAccessKey,
	},
});

/**
 * Cache-Control for uploaded objects. A meaningful max-age lets repeat
 * WhatsApp/IG visitors and page-to-page navigation reuse variants instead of
 * re-validating every AVIF. It is deliberately not `immutable` because the
 * bulk seed path can regenerate stable artwork keys. Versioned admin
 * replacements still avoid mixed old and new variants at the edge.
 */
const UPLOAD_CACHE_CONTROL = "public, max-age=86400, must-revalidate";

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
			CacheControl: UPLOAD_CACHE_CONTROL,
		}),
	);
	return `${PUBLIC_BASE_URL}/${key}`;
}

/**
 * How long a presigned upload URL stays valid. Long enough for a slow phone
 * connection to finish a full-resolution photo, short enough that a leaked URL
 * is not a standing write grant.
 */
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

/**
 * Presign a direct browser -> R2 PUT for one staged upload.
 *
 * Admin image bytes cannot travel through a server action: Vercel rejects any
 * function request body over ~4.5 MB at the edge (a 413 the action never sees),
 * which is smaller than a single phone photo. The browser therefore PUTs the
 * master straight to R2 and the action receives only the staged key.
 *
 * `contentType` and `contentLength` are signed, so R2 itself rejects a body
 * that does not match what the ticket was issued for.
 */
export async function presignUpload(
	key: string,
	contentType: string,
	contentLength: number,
): Promise<string> {
	return getSignedUrl(
		r2,
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			ContentType: contentType,
			ContentLength: contentLength,
		}),
		{ expiresIn: UPLOAD_URL_TTL_SECONDS },
	);
}

/** Byte size of one object, or null when it does not exist. */
export async function objectSize(key: string): Promise<number | null> {
	try {
		const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
		return head.ContentLength ?? null;
	} catch {
		return null;
	}
}

/** Download one object into memory. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
	const object = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
	if (!object.Body) throw new Error("Uploaded image could not be read back.");
	return Buffer.from(await object.Body.transformToByteArray());
}

/** S3 DeleteObjects accepts at most 1000 keys per request; chunk above that. */
const DELETE_BATCH_MAX = 1000;

/** Delete a batch of objects by key. No-op on an empty list. */
export async function deleteObjects(keys: string[]): Promise<void> {
	for (let i = 0; i < keys.length; i += DELETE_BATCH_MAX) {
		const batch = keys.slice(i, i + DELETE_BATCH_MAX);
		await r2.send(
			new DeleteObjectsCommand({
				Bucket: BUCKET,
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			}),
		);
	}
}

export const r2Config = { bucket: BUCKET, publicBaseUrl: PUBLIC_BASE_URL };

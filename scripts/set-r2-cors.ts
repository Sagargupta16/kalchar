/**
 * Apply the R2 bucket CORS policy that admin image uploads depend on.
 *
 * Admin uploads PUT the master straight from the browser to a presigned R2 URL
 * (see app/admin/upload-actions.ts), because Vercel rejects any function request
 * body over ~4.5 MB before the server action runs. A cross-origin PUT needs the
 * bucket to answer the browser's preflight, so without this policy every upload
 * fails at the OPTIONS step.
 *
 * Run once per bucket, and again whenever the allowed origins change:
 *   pnpm r2:cors
 *
 * Idempotent: PutBucketCors replaces the whole configuration each time.
 */
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "../lib/env";

/**
 * Origins allowed to upload. Production and www cover the live site, the Vercel
 * wildcard covers dev + PR previews, and the localhost pair covers `pnpm dev`
 * on its default and alternate ports.
 */
const ALLOWED_ORIGINS = [
	"https://kalchar.co.in",
	"https://www.kalchar.co.in",
	"https://*.vercel.app",
	"http://localhost:3000",
	"http://localhost:3001",
];

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: serverEnv.r2AccessKeyId,
		secretAccessKey: serverEnv.r2SecretAccessKey,
	},
});

async function main() {
	const Bucket = serverEnv.r2Bucket;

	await r2.send(
		new PutBucketCorsCommand({
			Bucket,
			CORSConfiguration: {
				CORSRules: [
					{
						AllowedOrigins: ALLOWED_ORIGINS,
						// PUT is the upload itself; the SDK sends Content-Type with it.
						AllowedMethods: ["PUT"],
						AllowedHeaders: ["content-type"],
						ExposeHeaders: ["etag"],
						MaxAgeSeconds: 3600,
					},
				],
			},
		}),
	);

	const applied = await r2.send(new GetBucketCorsCommand({ Bucket }));
	console.log(`CORS applied to bucket "${Bucket}":`);
	console.log(JSON.stringify(applied.CORSRules, null, 2));
}

main().catch((error) => {
	console.error("Failed to apply R2 CORS policy.", error);
	process.exit(1);
});

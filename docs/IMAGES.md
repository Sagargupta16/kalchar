# Images and Storage

Catalog, event, and profile images are processed by one sharp pipeline and stored in Cloudflare R2. Public pages serve fixed variants through the same-origin `/media/*` rewrite and native `<picture>` elements, with no runtime image transformation.

## Configuration

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | server | R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | server | R2 credential |
| `R2_SECRET_ACCESS_KEY` | server | R2 credential |
| `R2_BUCKET` | server | target bucket, default `kalchar-artworks` |
| `R2_PUBLIC_BASE_URL` | server | public object origin |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | shared | R2 public origin used by the server rewrite and absolute metadata URLs |

`lib/env.ts` validates values lazily. `lib/image-base.ts` is the single URL builder for artwork variants. Browser rendering uses `/media`, which `next.config.mjs` rewrites to the configured R2 origin. External metadata and server-side operations use the absolute `R2_*` exports. Event and profile rows store a complete key-base and use `IMAGE_ORIGIN`.

## Object contract

`VARIANT_WIDTHS` in `lib/image-base.ts` is shared by the writer and reader:

```text
<key-base>-400.avif   <key-base>-400.webp   <key-base>-400.jpg
<key-base>-800.avif   <key-base>-800.webp   <key-base>-800.jpg
<key-base>-1200.avif  <key-base>-1200.webp  <key-base>-1200.jpg
<key-base>-1600.avif  <key-base>-1600.webp  <key-base>-1600.jpg
<key-base>.jpg
```

Artwork key-bases start with `artworks/`. Event key-bases are `events/<event-id>/<image-id>`. Profile replacements use `profile/artist-<image-id>`. Every image has 13 objects.

The R2 master fallback is a normalized mozjpeg, not the original upload. Seeded source masters remain under `public/artworks/` so their variants can be regenerated and used as a final same-origin fallback if a proxied artwork request fails.

## Upload transport

Image bytes never pass through a server action. Vercel rejects any function request body over roughly 4.5 MB at the edge, returning a 413 the action never observes, and that ceiling is below a single full-resolution phone photo. Raising `serverActions.bodySizeLimit` cannot lift a platform cap, so the admin uploads direct to storage instead:

1. The browser asks `createUploadTicket(contentType, size)` (`app/admin/upload-actions.ts`) for a presigned PUT. That action re-checks the maintainer session, so a ticket is never issued anonymously, and validates the declared type and size.
2. The ticket points at a `staging/<uuid>` key. `presignUpload` signs the content type and content length, so R2 itself rejects a body that differs from what the ticket covers. Tickets expire after 15 minutes.
3. The browser PUTs the master straight to R2 (`stageImage` in `app/admin/_components/stage-image.ts`) and submits only the staged key in the form.
4. The mutation action calls `readStagedImage(key)` (`lib/storage/staged-upload.ts`), which confines the key to the staging prefix, HEADs the object to reject an oversized upload before buffering it, then downloads it for processing.
5. Once variants exist the staged master is discarded. Leftovers under `staging/` are unreferenced debris, never live records.

A cross-origin PUT requires bucket CORS, or every upload fails at the preflight. `pnpm r2:cors` (`scripts/set-r2-cors.ts`) applies the policy for the production domains, Vercel previews, and localhost.

That script needs an R2 API token with Admin Read and Write. The application token is scoped to objects and returns `AccessDenied` on bucket configuration, so either supply an admin token when running it or set the same rule in the Cloudflare dashboard under R2, the bucket, Settings, CORS policy:

| Field | Value |
| --- | --- |
| Allowed origins | `https://kalchar.co.in`, `https://www.kalchar.co.in`, `https://*.vercel.app`, `http://localhost:3000`, `http://localhost:3001` |
| Allowed methods | `PUT` |
| Allowed headers | `content-type` |
| Expose headers | `etag` |
| Max age | `3600` |

## Upload validation

`lib/storage/image-upload.ts` holds the validation contract, with no R2 dependency so it stays unit-testable:

- JPEG, PNG, and WebP only;
- maximum encoded size of 20 MB;
- maximum decoded size of 40 million pixels;
- decodable dimensions and a real supported input format.

`assertUploadAllowed` gates the ticket on declared metadata, and `validateImageBuffer` then decodes the stored bytes, so a client that lies about type or size still cannot get a disguised file processed. All sharp pipelines use the same pixel cap and fail on decode errors.

## Processing and rollback

`processImageVariants(keyBase, buffer)` rotates EXIF orientation, strips the orientation tag, and emits AVIF, WebP, and JPEG at each width without enlarging a smaller source. It tracks every attempted object key before upload. If encoding or upload fails, it requests deletion of all attempted keys and rethrows the original error.

`processArtworkImage` extracts a palette before writing variants. `createArtwork` removes the uploaded variant set if its database insert fails. Event creation and image addition also remove completed photos when a later upload or database update fails.

The R2 writer sets:

```text
Cache-Control: public, max-age=86400, must-revalidate
```

## Replacement

Artwork and profile replacements never overwrite the active key:

1. Validate and upload a new UUID-suffixed key-base.
2. Update the database row or setting to reference the new key.
3. If the database update fails, delete the new objects.
4. After a successful switch, delete the old objects as best-effort cleanup.

This order avoids mixed old/new variants and stale edge-cache results. A final cleanup failure leaves only an unreachable old object; the public row continues to reference the complete new set.

Artwork consumers derive URLs from the stored `image` field rather than the artwork slug. This includes gallery images, lightboxes, admin thumbnails, product metadata, JSON-LD, Twitter cards, preload hints, and `catalog.csv`.

## Delete behavior

Destructive actions remove the database reference first, then attempt R2 cleanup. This applies to artwork deletion, event deletion, individual event-photo removal, and profile clearing. If storage cleanup fails, the public database state stays valid and the unreachable object is logged for later maintenance.

This ordering keeps Neon as the source of truth and avoids leaving a live row that points to an image already deleted from R2. The Neon HTTP driver cannot provide a transaction spanning R2 and Postgres, so orphan cleanup remains an operational task.

## Serving

`ResponsiveImage` builds same-origin AVIF, WebP, and JPEG `srcset` values and lets the browser choose the first supported format and smallest suitable width. Next rewrites those paths to R2, so privacy-focused browsers never request the R2 hostname directly. `ArtImage` adapts a stored artwork filename to that generic key-base component and provides the checked-in master as a final fallback.

Priority images load eagerly with high fetch priority. Other images use lazy loading and a short decode settle. Reduced-motion visitors skip the settle. A failed image renders an accessible placeholder instead of a broken browser icon.

The artwork lightbox preloads only immediate neighbors. It skips preloads for Save-Data and reduced-motion users, uses 800px on small screens, and 1600px on larger screens.

## Bulk regeneration

```sh
pnpm db:images
```

`scripts/migrate-images-to-r2.ts` processes checked-in artwork masters with the same code used by admin uploads. It uses a bounded worker pool and overwrites the stable seed keys, which makes it suitable for rebuilding the original catalog after an encoder change.

Admin-uploaded replacements, event photos, and profile photos are not stored in this repository. Keep their original files in an access-controlled external archive. Backup and restore expectations are in [OPERATIONS.md](OPERATIONS.md).

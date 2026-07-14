# Images and Storage

Catalog, event, and profile images are processed by one sharp pipeline and stored in Cloudflare R2. Public pages serve fixed variants directly from R2 through native `<picture>` elements, with no runtime image transformation.

## Configuration

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | server | R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | server | R2 credential |
| `R2_SECRET_ACCESS_KEY` | server | R2 credential |
| `R2_BUCKET` | server | target bucket, default `kalchar-artworks` |
| `R2_PUBLIC_BASE_URL` | server | public object origin |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | browser | same public origin, compiled into image URLs |

`lib/env.ts` validates values lazily. `lib/image-base.ts` is the single URL builder for artwork variants. Event and profile rows store a complete key-base and use `IMAGE_ORIGIN`.

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

The master fallback is a normalized mozjpeg, not the original upload. Seeded source masters remain under `public/artworks/` so their variants can be regenerated.

## Upload validation

`lib/storage/image-upload.ts` enforces the upload boundary before R2 is touched:

- JPEG, PNG, and WebP only;
- maximum encoded size of 20 MB;
- maximum decoded size of 40 million pixels;
- decodable dimensions and a real supported input format.

The MIME check gives immediate feedback, while sharp verifies the bytes and limits decompression work. All sharp pipelines use the same pixel cap and fail on decode errors.

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

`ResponsiveImage` builds AVIF, WebP, and JPEG `srcset` values and lets the browser choose the first supported format and smallest suitable width. `ArtImage` adapts a stored artwork filename to that generic key-base component.

Priority images load eagerly with high fetch priority. Other images use lazy loading and a short decode settle. Reduced-motion visitors skip the settle. A failed image renders an accessible placeholder instead of a broken browser icon.

The artwork lightbox preloads only immediate neighbors. It skips preloads for Save-Data and reduced-motion users, uses 800px on small screens, and 1600px on larger screens.

## Bulk regeneration

```sh
pnpm db:images
```

`scripts/migrate-images-to-r2.ts` processes checked-in artwork masters with the same code used by admin uploads. It uses a bounded worker pool and overwrites the stable seed keys, which makes it suitable for rebuilding the original catalog after an encoder change.

Admin-uploaded replacements, event photos, and profile photos are not stored in this repository. Keep their original files in an access-controlled external archive. Backup and restore expectations are in [OPERATIONS.md](OPERATIONS.md).

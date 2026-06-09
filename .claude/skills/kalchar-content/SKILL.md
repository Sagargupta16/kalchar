---
name: kalchar-content
description: Add or edit catalog content (artworks, workshops, categories, custom-order presets) for the kalchar portfolio through the data seam -- the live Neon DB is the source of truth, data/*.json is the seed. Handles the R2 image pipeline, the house copy rules, and the CHANGELOG bump. Use for any "add this artwork / new workshop / edit a piece / update the catalog" request.
when_to_use: |
  Trigger on: "add an artwork / piece / painting", "new workshop", "add a category", "edit/update an artwork", "change the price / mark sold / feature this", "add a custom-order size/budget/timeline", "upload these images", "update the catalog / gallery content". NOT for layout/component changes (that's frontend work) -- this is catalog data + images.
---

# kalchar-content

Adds and edits the catalog the way this site is wired: **Neon (Drizzle) is the live source of truth; `data/*.json` is the original seed.** Everything reads through `lib/data.ts`. Pick the right path, respect the image pipeline and copy rules, bump the changelog.

## First decision: which path?

1. **Live edit (normal case)** -- the catalog is in Neon; the site is on Vercel. Changes go through the **admin panel server actions** in `app/admin/actions.ts` (`createArtwork`, `updateArtworkMeta`, `setPrice`, `setStatus`, `setFeatured`, `createWorkshop`, `createCategory`, `createOrderPreset`, ...). Each re-checks `isMaintainer`, runs the sharp->R2 image pipeline on upload, and `revalidatePath`s the public pages. For a maintainer doing this in the running app, that's the route -- no code change, no deploy.
2. **Seed/bulk edit (code path)** -- editing `data/artworks.json` / `data/site.json` then re-seeding: `pnpm db:seed` (JSON -> Neon) and `pnpm db:images` (image variants -> R2). Use for bulk imports or resetting. Needs `.env.local`.

If the user just wants a piece added and the app is live, prefer path 1 (or guide them to /admin). If they're editing the repo's seed data, path 2.

## Artwork shape (data/artworks.json `items[]` / artworks table)

```jsonc
{
  "slug": "radha-krishna",          // kebab, unique, stable (URLs depend on it)
  "title": "Radha and Krishna",
  "style": "Madhubani",             // must match an existing category name
  "medium": "Acrylic on canvas",
  "aspectRatio": 0.81,              // width/height; set by the image pipeline on upload
  "featured": true,                  // hero/rail inclusion
  "order": 1,                        // ascending sort; use getNextOrder pattern
  "description": "...",             // no literal ' -- '
  "image": "radha-krishna.jpg",     // master in public/artworks/; R2 regenerate source
  "palette": ["#c0392b", ...]        // sampled hexes (extractPalette); data, not theme -> hex OK here
}
```
- `priceInr` (optional): when set, status becomes `available`; cleared -> `archive`. `status` is `archive | available | sold`.
- Workshops: `{ slug, title, blurb, durationHours?, order }`.

## Image pipeline (never shortcut it)

- Masters live in `public/artworks/<slug>.jpg` (the R2 regenerate source, NOT served at runtime).
- `lib/storage/process-artwork-image.ts` turns a master into AVIF/WebP/JPG x 4 widths + a master JPG, uploads under `artworks/<slug>...` to R2, and samples the palette. Admin upload calls it; `pnpm db:images` does it in bulk.
- The gallery `<picture>` resolves `ARTWORK_IMAGE_BASE/<slug>-<w>.<ext>` -- so output keys MUST match `<slug>`. Add the master, run the pipeline; don't hand-place variants.

## House copy rules (enforce on every text field)

- **No literal ` -- `** in any user-facing value (title, description, blurb, preset labels). Use comma/period/colon/parens.
- **No emojis** unless asked.
- **Voice:** the catalog speaks plainly; `data/site.json` artist-voice copy is first-person singular and we don't rewrite her words.
- Palette arrays are the one place raw hex is allowed (they're data).

## Steps

1. Clarify what's being added/edited and confirm the path (live admin action vs seed JSON).
2. For a new artwork: confirm slug (unique, kebab), category exists (else add it first), master image present. Apply copy rules to title/description.
3. Make the change (call the action, or edit JSON + `db:seed`/`db:images`). Keep `order` sane (append = max+1).
4. **Verify**: `pnpm typecheck` + `pnpm build` if code/JSON changed; for a live action, confirm the piece renders on `/work` and `/work/<slug>` (revalidate fired). Real artwork URLs should 200 from R2.
5. **CHANGELOG + version** (repo rule): a new-artwork/content edit is a patch bump; new section/content-model change is minor. Then hand to `ship-it`.

## Notes

- Don't import `data/*.json` or query Neon outside `lib/data.ts` -- go through the seam.
- `getSite()` (site.json chrome) stays sync; artwork/workshop getters are async Drizzle.
- Deleting an artwork removes its R2 variants (`deleteArtworkImages`) -- the delete action handles it; don't orphan images.

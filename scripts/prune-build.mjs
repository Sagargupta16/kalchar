/**
 * Post-build pruner.
 *
 * After `next build` writes the static export to `out/`, the raw artwork
 * masters at `out/artworks/` (~28 MB of 1800x2400 baseline JPGs) are no
 * longer referenced by any HTML / srcset -- the runtime consumes only the
 * `_opt/` derivatives. This script deletes the raw `out/artworks/` directory
 * so the deployed artifact ships only what's actually served.
 *
 * The repo's `public/artworks/` master copies stay untouched; this only
 * trims the build output.
 *
 * If the `_opt` derivatives are missing for some reason, this script bails
 * loudly rather than deleting unreferenced fallbacks.
 */

import { rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(ROOT, "out", "artworks");
const OPT_DIR = join(ROOT, "out", "_opt", "artworks");

async function exists(p) {
	try {
		await stat(p);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	if (!(await exists(RAW_DIR))) {
		console.log("[prune-build] no out/artworks/, skipping");
		return;
	}
	if (!(await exists(OPT_DIR))) {
		console.error(
			"[prune-build] out/_opt/artworks/ missing -- refusing to delete fallbacks. Run `pnpm run optimize:images` first.",
		);
		process.exit(1);
	}

	const before = await stat(RAW_DIR);
	await rm(RAW_DIR, { recursive: true, force: true });
	console.log(`[prune-build] removed out/artworks/ (${(before.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
	console.error("[prune-build] failed:", err);
	process.exit(1);
});

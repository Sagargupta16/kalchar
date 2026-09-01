/**
 * Lazy, cached access to sharp.
 *
 * sharp is a native module: it resolves a platform-specific binary
 * (`@img/sharp-linux-x64` on Vercel, win32 locally) at import time. Importing it
 * at module scope meant a binary that failed to load took the whole module down,
 * so any server action depending on it died before its own try/catch existed and
 * Next replaced the cause with the generic "specific message is omitted in
 * production builds" digest -- an unfixable-looking 500.
 *
 * Loading inside the call puts the failure where the action can catch it and
 * report something a maintainer can act on.
 */
import type sharpModule from "sharp";

type Sharp = typeof sharpModule;

let cached: Sharp | null = null;

/** Resolve sharp, or throw an error that names the real problem. */
export async function loadSharp(): Promise<Sharp> {
	if (cached) return cached;
	try {
		const mod = await import("sharp");
		cached = mod.default;
		return cached;
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Image processing is unavailable on the server: ${detail}`);
	}
}

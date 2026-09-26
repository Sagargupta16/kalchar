/**
 * Picks the colour a detail page's wall is painted in: the most saturated
 * swatch of the artwork's own palette that is dark enough to carry cream
 * type once the pigment band deepens it (OKLab lightness at most 0.62).
 * Returns undefined when nothing qualifies, so the band falls back to the
 * house terracotta. Pure and server-safe.
 */

const HEX = /^#?([0-9a-f]{6})$/i;
const MAX_LIGHTNESS = 0.62;

function toLinear(channel: number): number {
	const c = channel / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** OKLab lightness and chroma of an sRGB hex colour (Ottosson 2020). */
export function oklabOf(hex: string): { l: number; c: number } | null {
	const match = HEX.exec(hex.trim());
	if (!match?.[1]) return null;
	const n = Number.parseInt(match[1], 16);
	const r = toLinear((n >> 16) & 255);
	const g = toLinear((n >> 8) & 255);
	const b = toLinear(n & 255);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return { l: L, c: Math.hypot(A, B) };
}

export function wallTone(palette: readonly string[] | undefined | null): string | undefined {
	let best: { hex: string; c: number } | undefined;
	for (const hex of palette ?? []) {
		const lab = oklabOf(hex);
		if (!lab || lab.l > MAX_LIGHTNESS || lab.c < 0.04) continue;
		if (!best || lab.c > best.c) best = { hex: hex.startsWith("#") ? hex : `#${hex}`, c: lab.c };
	}
	return best?.hex;
}

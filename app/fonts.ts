/**
 * Self-hosted font loading via next/font/google.
 *
 * next/font fetches the requested subsets at build time, hashes them, and
 * inlines `@font-face` declarations -- no CDN call from the user's browser,
 * no FOIT (font-optical invisible text) since `display: swap` lets the
 * fallback render until the woff2 lands.
 *
 * Three families, narrow weight/subset selection so the bundle stays small:
 *   - Cormorant Garamond -- display serif (brand voice: italic titles, roman headlines)
 *   - Inter -- variable sans-serif body
 *   - Tiro Devanagari Hindi -- the Devanagari mark in the headline
 *
 * Face audit (visual-direction 1.1, 2026-09-14): the final type scale consumes
 *   - 600 roman  -> .t-headline (display rungs; zero new bytes, already loaded)
 *   - 500 italic -> .t-display and .t-numeral (work titles, pull quotes, numerals)
 *   - 400 italic -> .drop-cap first letter (inherits the paragraph's weight)
 * next/font loads the weight x style cross product, so no face can be dropped
 * without taking a consumed weight with it; the set below stays as is.
 * Fraunces trial (section 4 item 1, recommendation: keep Cormorant): a follow-up
 * branch can swap the family behind the same --font-display variable and add
 * font-optical-sizing to the display classes without touching any consumer.
 */
import { Cormorant_Garamond, Inter, Tiro_Devanagari_Hindi } from "next/font/google";

export const fontDisplay = Cormorant_Garamond({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	style: ["normal", "italic"],
	variable: "--font-display",
	display: "swap",
});

export const fontBody = Inter({
	subsets: ["latin"],
	variable: "--font-body",
	display: "swap",
});

export const fontDevanagari = Tiro_Devanagari_Hindi({
	subsets: ["devanagari"],
	weight: "400",
	variable: "--font-devanagari",
	display: "swap",
});

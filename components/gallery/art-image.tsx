"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { cn } from "@/lib/utils";

/**
 * Image component for catalog artwork.
 *
 * Emits a native `<picture>` with AVIF -> WebP -> JPG sources, each carrying
 * a 4-width srcset (400 / 800 / 1200 / 1600). The browser picks the smallest
 * variant whose width covers the rendered CSS width times its devicePixelRatio.
 *
 * Variants are served from Cloudflare R2 at
 * `<ARTWORK_IMAGE_BASE>/<slug>-<width>.<ext>` (lib/image-base.ts), with a
 * master-width `<slug>.jpg` as the bare-<img> fallback. They're produced by the
 * sharp pipeline in lib/storage/process-artwork-image.ts -- on admin upload, or
 * in bulk via `pnpm db:images`.
 *
 * On a 404 (missing variant in R2, stale slug) the `<img>`'s `onError` fires
 * and we render a soft placeholder so the broken-image icon never reaches a
 * visitor.
 *
 * Why not next/image? The gallery is a client component and images come from a
 * known R2 origin in a fixed variant set, so a hand-rolled `<picture>` gives us
 * responsive AVIF/WebP with zero runtime image-optimizer dependency
 * (`images.unoptimized: true` in next.config.mjs). See docs/IMAGES.md.
 */
interface ArtImageProps {
	/** Path to the master JPG, e.g. "/artworks/radha-krishna.jpg". */
	src: string;
	alt: string;
	className?: string;
	/** Marks the image LCP-critical: eager fetch, high priority. */
	priority?: boolean;
	/**
	 * CSS layout sizes hint for the browser's variant picker. Mirrors the
	 * grid widths of the consumer (e.g. "(min-width: 1024px) 33vw, 50vw").
	 */
	sizes: string;
	/**
	 * Cap the largest variant offered in the srcset (px width). The LCP images
	 * (home hero, detail plate) render in a ~370-460px slot, so on a high-DPR
	 * phone the picker would otherwise fetch the 1200w variant (~470KB of dense
	 * folk-art linework) -- 2.3s of transfer on simulated 4G, which dominates
	 * LCP. Capping at 800w keeps ~2x sharpness for that slot while roughly
	 * halving the bytes. Omit (full range) for grid thumbnails, which are not
	 * the LCP and benefit from the crispest variant on retina.
	 */
	maxWidth?: 400 | 800 | 1200 | 1600;
}

const WIDTHS = [400, 800, 1200, 1600] as const;

function deriveSlug(src: string): string {
	// "/artworks/radha-krishna.jpg" -> "radha-krishna"
	const file = src.split("/").pop() ?? "";
	return file.replace(/\.[^.]+$/, "");
}

function buildSrcset(slug: string, ext: "avif" | "webp" | "jpg", maxWidth?: number): string {
	return WIDTHS.filter((w) => !maxWidth || w <= maxWidth)
		.map((w) => `${ARTWORK_IMAGE_BASE}/${slug}-${w}.${ext} ${w}w`)
		.join(", ");
}

// Bare-<img> JPG fallback (R2 `<slug>.jpg`) -- mozjpeg-encoded at master width,
// used only when the browser supports no <source> (no srcset at all). Browsers
// with srcset support pick a per-width JPG from the image/jpeg <source> instead.
// The master in public/artworks/ stays in the repo as the R2 regenerate source.
function jpegFallback(slug: string): string {
	return `${ARTWORK_IMAGE_BASE}/${slug}.jpg`;
}

export function ArtImage({
	src,
	alt,
	className,
	priority = false,
	sizes,
	maxWidth,
}: Readonly<ArtImageProps>) {
	const [failed, setFailed] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const reduceMotion = usePrefersReducedMotion();

	if (failed) {
		return (
			<div
				role="img"
				aria-label={alt}
				className="absolute inset-0 grid place-items-center bg-bg-soft text-muted"
			>
				<ImageOff size={28} aria-hidden="true" />
			</div>
		);
	}

	const slug = deriveSlug(src);

	// Gallery-register settle: the image fades + lifts out of a soft blur as it
	// decodes, so plates resolve into place instead of popping. Priority (LCP)
	// images and reduced-motion users skip it. The ref callback covers the case
	// where the image is already cached/complete before React attaches onLoad.
	//
	// The hidden state is an INLINE `opacity:0` (not a class) so the no-JS
	// <noscript> net in app/layout.tsx unhides it for crawlers / JS-disabled
	// visitors -- the same contract Reveal relies on.
	const animate = !priority && !reduceMotion;
	const settle = (el: HTMLImageElement | null) => {
		// If the image is already cached/complete before React attaches onLoad,
		// mark it loaded so it doesn't stay stuck in the hidden pre-load state.
		if (el?.complete) setLoaded(true);
	};
	const imgClass = className ?? "absolute inset-0 h-full w-full object-cover";
	const settleStyle =
		animate && !loaded
			? ({ opacity: 0, filter: "blur(2px)", transform: "scale(1.02)" } as const)
			: undefined;

	return (
		<picture>
			<source type="image/avif" srcSet={buildSrcset(slug, "avif", maxWidth)} sizes={sizes} />
			<source type="image/webp" srcSet={buildSrcset(slug, "webp", maxWidth)} sizes={sizes} />
			<source type="image/jpeg" srcSet={buildSrcset(slug, "jpg", maxWidth)} sizes={sizes} />
			<img
				ref={settle}
				src={jpegFallback(slug)}
				alt={alt}
				loading={priority ? "eager" : "lazy"}
				decoding={priority ? "sync" : "async"}
				fetchPriority={priority ? "high" : "auto"}
				onLoad={() => setLoaded(true)}
				onError={() => setFailed(true)}
				style={settleStyle}
				className={cn(
					imgClass,
					animate &&
						"transition-[opacity,transform,filter] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none",
				)}
			/>
		</picture>
	);
}

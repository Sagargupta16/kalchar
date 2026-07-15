"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { IMAGE_ORIGIN, VARIANT_WIDTHS } from "@/lib/image-base";
import { cn } from "@/lib/utils";

/**
 * Generic responsive image for R2-hosted catalog assets (artworks + events).
 *
 * Given a `keyBase` (the R2 path WITHOUT extension, e.g. "artworks/radha" or
 * "events/<id>/<imageId>"), it emits a native `<picture>` with AVIF -> WebP ->
 * JPG sources, each a 4-width srcset (400 / 800 / 1200 / 1600), plus a
 * master-width "<keyBase>.jpg" bare-<img> fallback. The variant set is produced
 * by lib/storage/process-artwork-image.ts `processImageVariants`.
 *
 * On a 404 (missing variant, stale key) the <img> onError renders a soft
 * placeholder so the broken-image icon never reaches a visitor.
 *
 * ArtImage is a thin wrapper over this; events use it directly. See docs/IMAGES.md.
 */
interface ResponsiveImageProps {
	/** R2 key-base without extension, e.g. "artworks/radha-krishna". */
	keyBase: string;
	/** Optional same-origin image used when the R2 request fails. */
	fallbackSrc?: string;
	alt: string;
	className?: string;
	/** Marks the image LCP-critical: eager fetch, high priority. */
	priority?: boolean;
	/** CSS layout sizes hint for the browser's variant picker. */
	sizes: string;
	/** Cap the largest variant offered (px width). Omit for full range. */
	maxWidth?: 400 | 800 | 1200 | 1600;
}

/** Pre-decode "settle" state the plate animates out of as it loads. */
const SETTLE_HIDDEN_STYLE = { opacity: 0, filter: "blur(2px)", transform: "scale(1.02)" } as const;
const FALLBACK_CLASS_NAME = "absolute inset-0 grid place-items-center bg-bg-soft text-muted";
type ImageSource = "remote" | "fallback" | "failed";

function buildSrcset(keyBase: string, ext: "avif" | "webp" | "jpg", maxWidth?: number): string {
	return VARIANT_WIDTHS.filter((w) => !maxWidth || w <= maxWidth)
		.map((w) => `${IMAGE_ORIGIN}/${keyBase}-${w}.${ext} ${w}w`)
		.join(", ");
}

export function ResponsiveImage({
	keyBase,
	fallbackSrc,
	alt,
	className,
	priority = false,
	sizes,
	maxWidth,
}: Readonly<ResponsiveImageProps>) {
	const [imageSource, setImageSource] = useState<ImageSource>("remote");
	const [loaded, setLoaded] = useState(false);
	const reduceMotion = usePrefersReducedMotion();

	// Reset per image: when the same mounted instance is pointed at a new
	// keyBase (lightbox arrows, hero shuffle), a previous photo's failure or
	// settle state must not leak onto it -- otherwise one 404 would show the
	// placeholder for every photo after it. Render-time adjust-state pattern.
	const [seenKeyBase, setSeenKeyBase] = useState(keyBase);
	if (seenKeyBase !== keyBase) {
		setSeenKeyBase(keyBase);
		setImageSource("remote");
		setLoaded(false);
	}
	const activeSource = seenKeyBase === keyBase ? imageSource : "remote";
	const handleError = () => {
		setLoaded(false);
		setImageSource((current) => (current === "remote" && fallbackSrc ? "fallback" : "failed"));
	};
	const settle = (el: HTMLImageElement | null) => {
		if (!el) return;
		if (el.complete && el.naturalWidth > 0) {
			setLoaded(true);
			return;
		}

		// Picture source selection can still be pending when the ref attaches.
		// Recheck next frame to catch only failures that predate hydration.
		globalThis.requestAnimationFrame(() => {
			if (!el.isConnected || !el.complete) return;
			if (el.naturalWidth > 0) setLoaded(true);
			else handleError();
		});
	};
	if (activeSource === "failed") {
		if (!alt) {
			return (
				<div aria-hidden="true" className={FALLBACK_CLASS_NAME}>
					<ImageOff size={28} aria-hidden="true" />
				</div>
			);
		}

		return (
			<div role="img" aria-label={alt} className={FALLBACK_CLASS_NAME}>
				<ImageOff size={28} aria-hidden="true" />
			</div>
		);
	}

	// Gallery-register settle: the image fades + lifts out of a soft blur as it
	// decodes. Priority (LCP) images and reduced-motion users skip it. The hidden
	// state is an INLINE opacity:0 so the no-JS <noscript> net in layout.tsx
	// unhides it for crawlers -- the same contract Reveal relies on.
	const isFallback = activeSource === "fallback";
	const animate = !isFallback && !priority && !reduceMotion;
	const imgClass = className ?? "absolute inset-0 h-full w-full object-cover";
	const settleStyle = animate && !loaded ? SETTLE_HIDDEN_STYLE : undefined;
	const image = (
		// biome-ignore lint/performance/noImgElement: native picture sources provide the R2 format and width selection
		<img
			key={`${keyBase}:${activeSource}`}
			ref={settle}
			src={isFallback ? fallbackSrc : `${IMAGE_ORIGIN}/${keyBase}.jpg`}
			alt={alt}
			loading={priority ? "eager" : "lazy"}
			decoding={priority ? "sync" : "async"}
			fetchPriority={priority ? "high" : "auto"}
			onLoad={() => setLoaded(true)}
			onError={handleError}
			style={settleStyle}
			className={cn(
				imgClass,
				animate &&
					"transition-[opacity,transform,filter] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none",
			)}
		/>
	);

	if (isFallback) return image;

	return (
		<picture>
			<source type="image/avif" srcSet={buildSrcset(keyBase, "avif", maxWidth)} sizes={sizes} />
			<source type="image/webp" srcSet={buildSrcset(keyBase, "webp", maxWidth)} sizes={sizes} />
			<source type="image/jpeg" srcSet={buildSrcset(keyBase, "jpg", maxWidth)} sizes={sizes} />
			{image}
		</picture>
	);
}

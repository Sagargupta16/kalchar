"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
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
	/** Reports the decoded image's intrinsic size (photos with no stored ratio). */
	onNaturalSize?: (width: number, height: number) => void;
}

/** Pre-decode "settle" state the plate animates out of as it loads. */
const SETTLE_HIDDEN_STYLE = { opacity: 0, transform: "scale(1.02)" } as const;
const SETTLE_TRANSITION_CLASS =
	"transition-[opacity,transform] duration-(--duration-enter) ease-(--ease-out)";
const FALLBACK_CLASS_NAME = "absolute inset-0 grid place-content-center gap-2 bg-canvas text-muted";
type ImageSource = "remote" | "fallback" | "failed";
/**
 * shown = rendered as is (the server HTML, or pixels were already on screen
 * when the client attached); waiting = the client saw no pixels yet and holds
 * the settle from-state; settling = it loaded after waiting and eases in.
 */
type SettleState = "shown" | "waiting" | "settling";

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
	onNaturalSize,
}: Readonly<ResponsiveImageProps>) {
	const [imageSource, setImageSource] = useState<ImageSource>("remote");
	const [settleState, setSettleState] = useState<SettleState>("shown");

	// Reset per image: when the same mounted instance is pointed at a new
	// keyBase (lightbox arrows, hero shuffle), a previous photo's failure or
	// settle state must not leak onto it -- otherwise one 404 would show the
	// placeholder for every photo after it. Render-time adjust-state pattern.
	const [seenKeyBase, setSeenKeyBase] = useState(keyBase);
	if (seenKeyBase !== keyBase) {
		setSeenKeyBase(keyBase);
		setImageSource("remote");
		setSettleState("shown");
	}
	const activeSource = seenKeyBase === keyBase ? imageSource : "remote";
	// Gallery-register settle: the image fades in and settles from 1.02 as it
	// decodes (opacity + transform only, compositor-safe). Priority (LCP) images
	// and the same-origin fallback skip it.
	const isFallback = activeSource === "fallback";
	const animate = !isFallback && !priority;
	// Advance one step from the source that actually failed. The error event and
	// the pre-hydration recheck below can both report the same remote failure; a
	// report about a source already replaced is stale and must not push a working
	// fallback on to "failed".
	const failFrom = (source: ImageSource) => {
		setImageSource((current) => {
			if (current !== source) return current;
			return current === "remote" && fallbackSrc ? "fallback" : "failed";
		});
	};
	const markLoaded = (el: HTMLImageElement) => {
		setSettleState((current) => (current === "waiting" ? "settling" : current));
		if (el.naturalWidth > 0) onNaturalSize?.(el.naturalWidth, el.naturalHeight);
	};
	// Fails open: the server HTML never carries the hidden state, so a slow or
	// failed hydration still shows every image the moment it loads. The client
	// only hides an image it can see has no pixels yet (naturalWidth 0), and by
	// then the onLoad handler is attached, so the settle always completes.
	const settle = (el: HTMLImageElement | null) => {
		if (!el) return;
		if (el.complete && el.naturalWidth > 0) {
			markLoaded(el);
			return;
		}
		if (animate && el.naturalWidth === 0) setSettleState("waiting");

		// Picture source selection can still be pending when the ref attaches.
		// Recheck next frame to catch loads and failures that predate hydration.
		const source = activeSource;
		globalThis.requestAnimationFrame(() => {
			if (!el.isConnected || !el.complete) return;
			if (el.naturalWidth > 0) markLoaded(el);
			else failFrom(source);
		});
	};
	if (activeSource === "failed") {
		// The caption is visual only: the labelled branch already names the image.
		const caption = (
			<>
				<ImageOff className="mx-auto size-7 md:size-9" aria-hidden="true" />
				<span className="t-meta">Image unavailable</span>
			</>
		);
		if (!alt) {
			return (
				<div aria-hidden="true" className={FALLBACK_CLASS_NAME}>
					{caption}
				</div>
			);
		}

		return (
			<div role="img" aria-label={alt} className={FALLBACK_CLASS_NAME}>
				{caption}
			</div>
		);
	}

	const imgClass = className ?? "absolute inset-0 h-full w-full object-cover";
	// The transition is only on while settling, so arming "waiting" over an
	// already painted (empty) box never fades anything out.
	const settleStyle = animate && settleState === "waiting" ? SETTLE_HIDDEN_STYLE : undefined;
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
			onLoad={(loadEvent) => markLoaded(loadEvent.currentTarget)}
			onError={() => failFrom(activeSource)}
			style={settleStyle}
			className={cn(imgClass, animate && settleState === "settling" && SETTLE_TRANSITION_CLASS)}
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

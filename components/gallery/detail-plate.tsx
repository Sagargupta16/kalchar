"use client";

import { Maximize2 } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { ArtworkStatusBadge } from "@/components/gallery/artwork-status-badge";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { LightboxIconButton } from "@/components/gallery/viewer-dialog";
import { isPositivePrice } from "@/lib/catalog";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * False until the first client mount of this module in the session. A hard
 * load (hydration) is the LCP paint, so the plate must render unclipped
 * (performance guard 3); any later mount is a client-side navigation, where
 * the 700ms unveil is welcome. The spec's navigation-entry check cannot tell
 * the two apart (soft navigations add no PerformanceNavigationTiming entry),
 * so this module flag carries the intent; noted for the reviewer.
 */
let hasMountedOnce = false;

interface DetailPlateProps {
	artwork: Artwork;
	/** Catalog list wired into the lightbox so paging sweeps the archive. */
	siblings: readonly Artwork[];
	alt: string;
	sizes: string;
	maxWidth: 400 | 800 | 1200 | 1600;
}

/**
 * The detail page's plate (visual-direction 2.3): full-bleed on phones at a
 * <= 72dvh cap (bound through width, since the box is aspect-ratio driven),
 * sticky beside the info column from md on tall-enough viewports, resting
 * gold inset line, and lightbox v2 as the tap target: the whole plate opens
 * it, with a 44px Expand affordance at the bottom-right.
 *
 * The plate hangs on the museum wall (steering 2026-09-14): a .plate-float
 * wrapper (animations.css) breathes the frame, the full-plate trigger and
 * the Expand control as one unit, over the e3-edged rest PlateFrame already
 * carries. Paused below md via --float-state, where the plate is full-bleed
 * and a drifting flush edge reads as jitter, not suspension; reduced motion
 * removes the loop entirely at the animations.css level.
 */
export function DetailPlate({
	artwork,
	siblings,
	alt,
	sizes,
	maxWidth,
}: Readonly<DetailPlateProps>) {
	const { openLightbox } = useLightbox();
	const [unveil] = useState(() => hasMountedOnce);
	useEffect(() => {
		hasMountedOnce = true;
	}, []);

	const open = (e?: MouseEvent) => {
		openLightbox(
			artwork,
			siblings,
			e
				? {
						xPct: (e.clientX / window.innerWidth) * 100,
						yPct: (e.clientY / window.innerHeight) * 100,
					}
				: undefined,
		);
	};

	const isAvailable = isPositivePrice(artwork.priceInr);
	const isSold = artwork.status === "sold";

	return (
		<div className="md:top-[calc(var(--header-h-shrunk)+var(--space-page))] [@media(min-width:48rem)_and_(min-height:43.8125rem)]:sticky">
			<div className="-mx-(--container-px) md:mx-0">
				<div
					style={{ "--plate-ratio": artwork.aspectRatio } as CSSProperties}
					className="relative mx-auto aspect-(--plate-ratio) w-[min(100%,calc(72dvh*var(--plate-ratio)))] md:w-[min(100%,calc((100dvh-var(--header-h-shrunk)-4rem)*var(--plate-ratio)))]"
				>
					<div className="plate-float absolute inset-0 [--float-travel:7px] max-md:[--float-state:paused]">
						<PlateFrame
							radius="lg"
							goldRest
							className={cn(
								"absolute inset-0 rounded-none md:rounded-(--radius-lg)",
								unveil && "reveal-plate reveal-plate-unveil",
							)}
						>
							<ArtImage
								src={`/artworks/${artwork.image}`}
								alt={alt}
								sizes={sizes}
								maxWidth={maxWidth}
								priority
								className="absolute inset-0 h-full w-full object-contain"
							/>
							<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} />
						</PlateFrame>
						{/* The whole plate is the trigger; the 44px Expand button is the
						    accessible control (same pattern as the viewer's backdrop). Both
						    live inside the float wrapper so the affordance never detaches
						    from the breathing frame. */}
						<button
							type="button"
							tabIndex={-1}
							aria-hidden="true"
							onClick={(e) => open(e)}
							className="absolute inset-0 cursor-zoom-in"
						/>
						<LightboxIconButton
							onClick={() => open()}
							aria-label="View full screen"
							className="absolute bottom-3 right-3"
						>
							<Maximize2 size={18} aria-hidden="true" />
						</LightboxIconButton>
					</div>
				</div>
			</div>
		</div>
	);
}

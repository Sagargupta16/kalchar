"use client";

import { useEffect, useState } from "react";
import { ArtistAvatar } from "@/components/about/artist-avatar";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { cn } from "@/lib/utils";

/**
 * False until the first client mount of this module in the session. A hard
 * load (hydration) is the LCP paint, so the portrait must render unclipped
 * (performance guard 3); any later mount is a client-side navigation, where
 * the 700ms unveil is welcome. Same module-flag pattern as DetailPlate.
 */
let hasMountedOnce = false;

interface PortraitPlateProps {
	/** R2 key-base for the profile image, or undefined for the monogram fallback. */
	imageKey?: string;
	/** Devanagari brand mark shown in the fallback. */
	monogram: string;
	alt: string;
	/** Wall-label title: the artist name in the italic titled-work voice. */
	title: string;
	/** Wall-label meta facts (tagline, location); joined with a middle dot. */
	meta: string[];
	className?: string;
}

/**
 * The about page's artist plate (visual-direction 2.5): ArtistAvatar inside a
 * PlateFrame with the gold inset line resting at 3:4, the museum WallLabel
 * beneath (name italic / tagline / location; index and price absent), and the
 * 700ms plate unveil on client navigations only. The avatar's own chrome is
 * neutralised so the frame owns radius and shadow (the about-teaser pattern).
 */
export function PortraitPlate({
	imageKey,
	monogram,
	alt,
	title,
	meta,
	className,
}: Readonly<PortraitPlateProps>) {
	const [unveil] = useState(() => hasMountedOnce);
	useEffect(() => {
		hasMountedOnce = true;
	}, []);

	return (
		<div className={className}>
			<PlateFrame
				goldRest
				className={cn("aspect-3/4", unveil && "reveal-plate reveal-plate-unveil")}
			>
				<ArtistAvatar
					imageKey={imageKey}
					monogram={monogram}
					alt={alt}
					sizes="(min-width: 768px) 30vw, 100vw"
					priority
					className="absolute inset-0 aspect-auto h-full w-full rounded-none shadow-none"
				/>
			</PlateFrame>
			<WallLabel variant="full" stagger title={title} meta={meta} className="mt-4" />
		</div>
	);
}

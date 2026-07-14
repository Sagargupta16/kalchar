"use client";

import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { artworkImageKey } from "@/lib/image-base";

/**
 * Image component for catalog artwork. A thin wrapper over ResponsiveImage that
 * maps the legacy `src` prop ("/artworks/<slug>.jpg") to the R2 key-base
 * ("artworks/<slug>"). All existing callers pass `src`; the responsive
 * <picture>/srcset behaviour lives in ResponsiveImage. See docs/IMAGES.md.
 */
interface ArtImageProps {
	/** Path to the master JPG, e.g. "/artworks/radha-krishna.jpg". */
	src: string;
	alt: string;
	className?: string;
	priority?: boolean;
	sizes: string;
	maxWidth?: 400 | 800 | 1200 | 1600;
}

export function ArtImage({ src, ...rest }: Readonly<ArtImageProps>) {
	return <ResponsiveImage keyBase={`artworks/${artworkImageKey(src)}`} {...rest} />;
}

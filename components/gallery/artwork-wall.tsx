"use client";

import { useMemo } from "react";
import { ArtworkCard, WALL_CAPTION_PX } from "@/components/gallery/artwork-card";
import { useMasonry } from "@/components/gallery/use-masonry";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArtworkWallProps {
	artworks: readonly Artwork[];
	siblings: readonly Artwork[];
	sizes?: string;
	priorityCount?: number;
	/** 1-based catalogue position by slug, announced to screen readers. */
	catalogIndex?: Record<string, number>;
	totalCount?: number;
	maxColumns?: number;
	/** Scroll-reveal delay per item (ms); a plain array so a server parent can pass it. */
	revealDelays?: readonly number[];
	className?: string;
}

/**
 * A short masonry strip (home previews, the custom-orders inspiration row)
 * on the same shortest-column placement as the /work wall, so a strip of five
 * never leaves one column ending a painting early the way CSS columns do.
 */
export function ArtworkWall({
	artworks,
	siblings,
	sizes,
	priorityCount = 0,
	catalogIndex,
	totalCount,
	maxColumns = 4,
	revealDelays,
	className,
}: Readonly<ArtworkWallProps>) {
	const ratios = useMemo(() => artworks.map((art) => art.aspectRatio), [artworks]);
	const wall = useMasonry<HTMLUListElement>(ratios, WALL_CAPTION_PX, maxColumns);
	return (
		<ul ref={wall.hostRef} className={cn("mt-8", className)} style={wall.hostStyle}>
			{artworks.map((art, index) => (
				<li key={art.slug} className="min-w-0" style={wall.itemStyle(index)}>
					<ArtworkCard
						variant="wall"
						artwork={art}
						siblings={siblings}
						priority={index < priorityCount}
						sizes={sizes}
						index={catalogIndex ? (catalogIndex[art.slug] ?? 0) + 1 : undefined}
						total={totalCount}
						revealDelayMs={revealDelays?.[index] ?? 0}
					/>
				</li>
			))}
		</ul>
	);
}

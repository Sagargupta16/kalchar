"use client";

import Link from "next/link";
import { ArtImage } from "@/components/gallery/art-image";
import { ArtworkStatusBadge } from "@/components/gallery/artwork-status-badge";
import { Chromacard } from "@/components/gallery/chromacard";
import { GALLERY_CARD_SIZES } from "@/components/gallery/gallery-grid";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { isPositivePrice } from "@/lib/catalog";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

interface ArtworkCardProps {
	artwork: Artwork;
	priority?: boolean;
	className?: string;
	siblings?: readonly Artwork[];
	/** Image sizes hint; defaults to the 3-column gallery grid's. */
	sizes?: string;
}

export function ArtworkCard({
	artwork,
	priority = false,
	className,
	siblings,
	sizes = GALLERY_CARD_SIZES,
}: Readonly<ArtworkCardProps>) {
	const { openLightbox } = useLightbox();

	const handleClick = (e: React.MouseEvent) => {
		if (!e.metaKey && !e.ctrlKey && e.button === 0) {
			e.preventDefault();
			openLightbox(artwork, siblings);
		}
	};

	const imgSrc = `/artworks/${artwork.image}`;
	const isAvailable = isPositivePrice(artwork.priceInr);
	const isSold = artwork.status === "sold";
	let statusLabel: string | null = null;
	if (isSold) statusLabel = "sold";
	else if (isPositivePrice(artwork.priceInr)) {
		statusLabel = `available, ${formatInr(artwork.priceInr)}`;
	}
	const ariaLabel = [artwork.title, artwork.style, statusLabel].filter(Boolean).join(", ");

	return (
		<Link
			href={`/work/${artwork.slug}`}
			onClick={handleClick}
			className={cn("group @container block pressable", className)}
			aria-label={ariaLabel}
		>
			{/* Image plate: the grid keeps the confirmed uniform 3:4 crop (D9). */}
			<div className="relative aspect-3/4 overflow-hidden rounded-(--radius-md) bg-canvas shadow-hairline transition-ui group-hover:shadow-e3 group-hover:ring-1 group-hover:ring-(--section-accent)">
				<ArtImage
					src={imgSrc}
					alt={artwork.description ?? `${artwork.title}, ${artwork.style}`}
					sizes={sizes}
					className="absolute inset-0 h-full w-full object-cover"
					priority={priority}
				/>

				{/* Gold border on hover */}
				<div className="pointer-events-none absolute inset-1.5 rounded-[calc(var(--radius-md)-6px)] border border-gold-leaf/0 transition-colors group-hover:border-gold-leaf/40" />

				<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} />
			</div>

			{/* Caption follows the card width (container query), not the viewport. */}
			<div className="mt-3 flex flex-col gap-1 @xs:flex-row @xs:items-baseline @xs:justify-between @xs:gap-2">
				<h3 className="t-display min-w-0 text-balance line-clamp-2 text-h3 transition-colors group-hover:text-(--section-accent)">
					{artwork.title}
				</h3>
				<span className="t-meta @xs:shrink-0 @xs:whitespace-nowrap">{artwork.style}</span>
			</div>

			<Chromacard
				palette={artwork.palette}
				ariaLabel={`Palette from ${artwork.title}`}
				className="mt-2"
				groupHoverBloom
			/>

			{artwork.description ? (
				<p className="mt-2 line-clamp-1 text-sm text-muted @xs:line-clamp-2">
					{artwork.description}
				</p>
			) : null}

			<div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
				<p className="min-w-0 text-xs text-muted text-pretty">{artwork.medium}</p>
				{isAvailable && typeof artwork.priceInr === "number" ? (
					<p className="ml-auto shrink-0 whitespace-nowrap text-sm font-medium text-ink tabular-nums">
						{formatInr(artwork.priceInr)}
					</p>
				) : null}
				{!isAvailable && !isSold ? (
					<p className="ml-auto shrink-0 text-xs text-muted">Not listed for sale</p>
				) : null}
			</div>
		</Link>
	);
}

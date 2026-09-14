"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { ArtworkStatusBadge } from "@/components/gallery/artwork-status-badge";
import { Chromacard } from "@/components/gallery/chromacard";
import { GALLERY_CARD_SIZES } from "@/components/gallery/gallery-grid";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { TiltPlate } from "@/components/motion/tilt-plate";
import { isPositivePrice } from "@/lib/catalog";
import { STAGGER } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

interface ArtworkCardProps {
	artwork: Artwork;
	priority?: boolean;
	className?: string;
	siblings?: readonly Artwork[];
	/** Image sizes hint; defaults to the 3-column gallery grid's. */
	sizes?: string;
	/** 1-based catalogue position for the wall-label counter ("No. 07"). */
	index?: number;
	/** Catalogue size for the counter's "of {total}" tail. */
	total?: number;
	/** Present = this card paints eagerly and its plate clip-unveils with this
	 *  delay. The clip lives on the image layer inside the frame (overflow is
	 *  already hidden there) so the hover shadow and 2px lift are never cropped
	 *  by a lingering clip-path (anti-pattern 3). */
	unveilDelayMs?: number;
	/** Slower 700ms unveil for the spanning lead tile. */
	unveilSlow?: boolean;
}

export function ArtworkCard({
	artwork,
	priority = false,
	className,
	siblings,
	sizes = GALLERY_CARD_SIZES,
	index,
	total,
	unveilDelayMs,
	unveilSlow = false,
}: Readonly<ArtworkCardProps>) {
	const { openLightbox } = useLightbox();

	const handleClick = (e: React.MouseEvent) => {
		if (!e.metaKey && !e.ctrlKey && e.button === 0) {
			e.preventDefault();
			openLightbox(artwork, siblings, {
				xPct: (e.clientX / window.innerWidth) * 100,
				yPct: (e.clientY / window.innerHeight) * 100,
			});
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

	let priceSlot: string | undefined;
	if (isAvailable && typeof artwork.priceInr === "number" && !isSold) {
		priceSlot = formatInr(artwork.priceInr);
	}
	let statusSlot: string | undefined;
	if (isSold) statusSlot = "Sold";
	else if (!isAvailable) statusSlot = "Not listed for sale";

	const unveiling = typeof unveilDelayMs === "number";

	return (
		<Link
			href={`/work/${artwork.slug}`}
			onClick={handleClick}
			className={cn("group @container block pressable", className)}
			aria-label={ariaLabel}
		>
			<TiltPlate>
				{/* Image plate: uniform 3:4 crop in the grid (D9). PlateFrame owns the
				    hairline, the elevate-e2 crossfade, the 2px lift and the gold inset
				    hover cue; a single gold-sheen pass crosses on hover (G9); the image
				    itself never scales (G1). */}
				<PlateFrame className="aspect-3/4">
					<div
						className={cn(
							"absolute inset-0",
							unveiling && "reveal-plate",
							unveiling && unveilSlow && "reveal-plate-unveil",
						)}
						style={
							unveiling ? ({ animationDelay: `${unveilDelayMs}ms` } as CSSProperties) : undefined
						}
					>
						<ArtImage
							src={imgSrc}
							alt={artwork.description ?? `${artwork.title}, ${artwork.style}`}
							sizes={sizes}
							className="absolute inset-0 h-full w-full object-cover"
							priority={priority}
						/>
					</div>
					<span
						aria-hidden="true"
						className="gold-sheen pointer-events-none absolute inset-0 hidden rounded-[inherit] [@media(hover:hover)_and_(pointer:fine)]:block"
					/>
					<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} placement="bottom-left" />
				</PlateFrame>
			</TiltPlate>

			{/* Caption rises one stagger step after its plate on the eager path
			    (visual-direction 2.2 motion). */}
			<div
				className={cn("mt-4", unveiling && "reveal-up")}
				style={
					unveiling
						? ({ animationDelay: `${unveilDelayMs + STAGGER.stepMs}ms` } as CSSProperties)
						: undefined
				}
			>
				<WallLabel
					variant="compact"
					index={index}
					total={total}
					title={artwork.title}
					meta={[artwork.style, artwork.medium, artwork.year ? String(artwork.year) : ""].filter(
						Boolean,
					)}
					price={priceSlot}
					status={statusSlot}
				/>

				{artwork.description ? (
					<p className="mt-2 hidden line-clamp-1 text-sm text-muted @xs:block">
						{artwork.description}
					</p>
				) : null}

				<Chromacard
					palette={artwork.palette}
					ariaLabel={`Palette from ${artwork.title}`}
					className="mt-2"
					groupHoverBloom
				/>
			</div>
		</Link>
	);
}

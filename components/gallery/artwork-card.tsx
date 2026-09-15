"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { type CSSProperties, useId } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { ArtworkStatusBadge } from "@/components/gallery/artwork-status-badge";
import { GALLERY_CARD_SIZES } from "@/components/gallery/gallery-grid";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { TiltPlate } from "@/components/motion/tilt-plate";
import { isPositivePrice } from "@/lib/catalog";
import { PRESS_SCALE, SPRING_PRESS, STAGGER } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

const AnimatedLink = motion.create(Link);
const CARD_LIFT = { y: -6 } as const;

interface ArtworkCardProps {
	artwork: Artwork;
	priority?: boolean;
	className?: string;
	siblings?: readonly Artwork[];
	/** Image sizes hint; defaults to the 3-column gallery grid's. */
	sizes?: string;
	/** Position announced to screen readers when browsing a collection. */
	index?: number;
	/** Number of pieces in the current collection. */
	total?: number;
	/** Eager image reveal, staggered within the visible row. */
	unveilDelayMs?: number;
	/** Slower 700ms unveil for the spanning lead tile. */
	unveilSlow?: boolean;
	/** A gentle idle float for a featured piece. */
	float?: boolean;
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
	float = false,
}: Readonly<ArtworkCardProps>) {
	const { openLightbox } = useLightbox();
	const positionId = useId();

	const handleClick = (e: React.MouseEvent) => {
		if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
			return;
		e.preventDefault();
		openLightbox(
			artwork,
			siblings,
			e.detail === 0
				? undefined
				: {
						xPct: (e.clientX / window.innerWidth) * 100,
						yPct: (e.clientY / window.innerHeight) * 100,
					},
		);
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
	const unveiling = typeof unveilDelayMs === "number";

	const plate = (
		<div className="relative aspect-4/5 overflow-hidden rounded-md bg-canvas">
			<div
				className={cn(
					"absolute inset-0",
					unveiling && "reveal-plate",
					unveiling && unveilSlow && "reveal-plate-unveil",
				)}
				style={unveiling ? ({ animationDelay: `${unveilDelayMs}ms` } as CSSProperties) : undefined}
			>
				<ArtImage
					src={imgSrc}
					alt={artwork.description ?? `${artwork.title}, ${artwork.style}`}
					sizes={sizes}
					className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
					priority={priority}
				/>
			</div>
			<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} placement="bottom-left" />
		</div>
	);

	return (
		<AnimatedLink
			href={`/work/${artwork.slug}`}
			onClick={handleClick}
			className={cn(
				"group @container flex h-full flex-col rounded-md border border-line/60 bg-surface p-1.5 shadow-e1 elevate-e3 transition-colors hover:border-accent/30",
				className,
			)}
			aria-label={ariaLabel}
			aria-describedby={index ? positionId : undefined}
			whileHover={CARD_LIFT}
			whileFocus={CARD_LIFT}
			whileTap={{ scale: PRESS_SCALE }}
			transition={SPRING_PRESS}
		>
			<TiltPlate>
				{float ? <div className="plate-float [--float-travel:5px]">{plate}</div> : plate}
			</TiltPlate>

			<div
				className={cn("flex flex-1 flex-col gap-2 p-3 sm:p-4", unveiling && "reveal-up")}
				style={
					unveiling
						? ({ animationDelay: `${unveilDelayMs + STAGGER.stepMs}ms` } as CSSProperties)
						: undefined
				}
			>
				<div className="flex items-start justify-between gap-2">
					<h3 className="min-w-0 text-base leading-snug font-semibold tracking-tight text-ink sm:text-lg">
						{artwork.title}
					</h3>
					<ArrowUpRight
						size={18}
						aria-hidden="true"
						className="mt-1 shrink-0 text-muted transition-[color,translate] duration-(--duration-fast) group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent-text"
					/>
				</div>
				<div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
					<p className="text-muted">{artwork.style}</p>
					{priceSlot ? <p className="font-semibold tabular-nums text-ink">{priceSlot}</p> : null}
				</div>
				{index ? (
					<span id={positionId} className="sr-only">
						Piece {index}
						{total ? ` of ${total}` : ""}
					</span>
				) : null}
			</div>
		</AnimatedLink>
	);
}

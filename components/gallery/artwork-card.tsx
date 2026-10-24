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
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { isPositivePrice } from "@/lib/catalog";
import { CARD_TILT_MAX_DEG, PRESS_SCALE, SPRING_PRESS } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

const AnimatedLink = motion.create(Link);
const CARD_LIFT = { y: -8 } as const;
const WALL_LIFT = { y: -6 } as const;

/** Wall card caption height in px (mt-3 + the h-[4.5rem] block); the masonry layout adds it to each plate. */
export const WALL_CAPTION_PX = 84;

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
	/** Eager image reveal on first paint (first screen of /work), staggered within the visible row. */
	unveilDelayMs?: number;
	/** Delay for the scroll-triggered unveil (the default when unveilDelayMs is absent). */
	revealDelayMs?: number;
	/** A gentle idle float for a featured piece. */
	float?: boolean;
	/**
	 * card = the bordered 4:5 mat (home strips, custom orders); wall = the
	 * /work gallery hang: the plate at the painting's own ratio with no mat,
	 * a sliding "View" label on hover and the caption as wall text.
	 */
	variant?: "card" | "wall";
}

/** A plain primary click: modified or non-left clicks keep the native link behaviour. */
function isPlainPrimaryClick(e: React.MouseEvent): boolean {
	return !(
		e.defaultPrevented ||
		e.metaKey ||
		e.ctrlKey ||
		e.shiftKey ||
		e.altKey ||
		e.button !== 0
	);
}

/** Where the lightbox grows from; keyboard activation (detail 0) opens from the centre. */
function pointerOrigin(e: React.MouseEvent): { xPct: number; yPct: number } | undefined {
	if (e.detail === 0) return undefined;
	return {
		xPct: (e.clientX / window.innerWidth) * 100,
		yPct: (e.clientY / window.innerHeight) * 100,
	};
}

/** Sale state, the accessible name and the visible price for one card. */
function describeArtwork(artwork: Artwork) {
	const isSold = artwork.status === "sold";
	const isAvailable = isPositivePrice(artwork.priceInr);
	const price =
		isAvailable && typeof artwork.priceInr === "number" ? formatInr(artwork.priceInr) : undefined;
	let statusLabel: string | null = null;
	if (isSold) statusLabel = "sold";
	else if (price) statusLabel = `available, ${price}`;
	const ariaLabel = [artwork.title, artwork.style, statusLabel].filter(Boolean).join(", ");
	const priceSlot = isSold ? undefined : price;
	return { isSold, isAvailable, ariaLabel, priceSlot };
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
	revealDelayMs = 0,
	float = false,
	variant = "card",
}: Readonly<ArtworkCardProps>) {
	const { openLightbox } = useLightbox();
	const positionId = useId();
	const [revealRef, revealState] = useViewReveal<HTMLAnchorElement>();

	const handleClick = (e: React.MouseEvent) => {
		if (!isPlainPrimaryClick(e)) return;
		e.preventDefault();
		openLightbox(artwork, siblings, pointerOrigin(e));
	};

	const imgSrc = `/artworks/${artwork.image}`;
	const { isSold, isAvailable, ariaLabel, priceSlot } = describeArtwork(artwork);
	const eager = typeof unveilDelayMs === "number";
	const cardDelay = {
		"--card-delay": `${eager ? unveilDelayMs : revealDelayMs}ms`,
	} as CSSProperties;

	const position = index ? (
		<span id={positionId} className="sr-only">
			Piece {index}
			{total ? ` of ${total}` : ""}
		</span>
	) : null;

	const common = {
		artwork,
		revealRef,
		revealState,
		handleClick,
		eager,
		cardDelay,
		className,
		ariaLabel,
		describedBy: index ? positionId : undefined,
		index,
		sizes,
		imgSrc,
		priority,
		isAvailable,
		isSold,
		priceSlot,
		position,
	};
	if (variant === "wall") return <WallCard {...common} />;

	// Three nested layers, one transform each: the wipe (clip-path + scale
	// settle on entrance), the hover zoom (1.05 inside the mat, pointer devices
	// only) and the painting itself, always object-contain so it is never cropped.
	const plate = (
		<div className="relative aspect-4/5 overflow-hidden rounded-md bg-canvas">
			<div className="card-wipe absolute inset-0">
				<div className="absolute inset-0 transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover:scale-105">
					<ArtImage
						src={imgSrc}
						alt={artwork.description ?? `${artwork.title}, ${artwork.style}`}
						sizes={sizes}
						className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
						priority={priority}
					/>
				</div>
			</div>
			<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} placement="bottom-left" />
		</div>
	);

	return (
		<AnimatedLink
			ref={revealRef}
			href={`/work/${artwork.slug}`}
			onClick={handleClick}
			data-motion-reveal={eager ? undefined : true}
			data-reveal={eager ? undefined : revealState}
			style={cardDelay}
			className={cn(
				"group @container flex h-full flex-col rounded-md border border-line/60 bg-surface p-1.5 shadow-e1 elevate-e3 transition-colors hover:border-accent/40",
				eager && "card-unveil-eager",
				className,
			)}
			aria-label={ariaLabel}
			aria-describedby={index ? positionId : undefined}
			whileHover={CARD_LIFT}
			whileFocus={CARD_LIFT}
			whileTap={{ scale: PRESS_SCALE }}
			transition={SPRING_PRESS}
		>
			<TiltPlate maxDeg={CARD_TILT_MAX_DEG}>
				{float ? <div className="plate-float [--float-travel:5px]">{plate}</div> : plate}
			</TiltPlate>

			<div className="card-caption flex flex-1 flex-col gap-2 p-3 sm:p-4">
				<div className="flex items-start justify-between gap-2">
					<h3 className="min-w-0 text-base leading-snug font-semibold tracking-tight text-ink sm:text-lg">
						{artwork.title}
					</h3>
					<span
						aria-hidden="true"
						className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line text-muted transition-ui group-hover:border-accent group-hover:bg-accent group-hover:text-bg"
					>
						<ArrowUpRight
							size={16}
							className="transition-[translate] duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
						/>
					</span>
				</div>
				<div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
					<p className="text-muted">{artwork.style}</p>
					{priceSlot ? <p className="font-semibold tabular-nums text-ink">{priceSlot}</p> : null}
				</div>
				{position}
			</div>
		</AnimatedLink>
	);
}

interface WallCardProps {
	artwork: Artwork;
	revealRef: ReturnType<typeof useViewReveal<HTMLAnchorElement>>[0];
	revealState: ReturnType<typeof useViewReveal<HTMLAnchorElement>>[1];
	handleClick: (e: React.MouseEvent) => void;
	eager: boolean;
	cardDelay: CSSProperties;
	className?: string;
	ariaLabel: string;
	describedBy?: string;
	index?: number;
	sizes: string;
	imgSrc: string;
	priority: boolean;
	isAvailable: boolean;
	isSold: boolean;
	priceSlot?: string;
	position: React.ReactNode;
}

/** The /work gallery hang: the plate at the painting's own ratio, no mat, caption as wall text. */
function WallCard({
	artwork,
	revealRef,
	revealState,
	handleClick,
	eager,
	cardDelay,
	className,
	ariaLabel,
	describedBy,
	index,
	sizes,
	imgSrc,
	priority,
	isAvailable,
	isSold,
	priceSlot,
	position,
}: Readonly<WallCardProps>) {
	return (
		<AnimatedLink
			ref={revealRef}
			href={`/work/${artwork.slug}`}
			onClick={handleClick}
			data-motion-reveal={eager ? undefined : true}
			data-reveal={eager ? undefined : revealState}
			style={cardDelay}
			className={cn("group flex flex-col rounded-md", eager && "card-unveil-eager", className)}
			aria-label={ariaLabel}
			aria-describedby={describedBy}
			whileHover={WALL_LIFT}
			whileFocus={WALL_LIFT}
			whileTap={{ scale: PRESS_SCALE }}
			transition={SPRING_PRESS}
		>
			<div
				className="relative overflow-hidden rounded-md bg-canvas shadow-e2-edged elevate-e3"
				style={{ aspectRatio: artwork.aspectRatio }}
			>
				<div className="card-wipe absolute inset-0">
					<div className="absolute inset-0 transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover:scale-[1.06]">
						<ArtImage
							src={imgSrc}
							alt={artwork.description ?? `${artwork.title}, ${artwork.style}`}
							sizes={sizes}
							className="absolute inset-0 h-full w-full object-contain"
							priority={priority}
						/>
					</div>
				</div>
				<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} placement="bottom-left" />
				<span
					aria-hidden="true"
					className="plate-peek absolute right-2 bottom-2 z-raised inline-flex min-h-8 items-center gap-1 rounded-full bg-scrim/85 px-3 text-xs font-medium text-bg dark:text-ink"
				>
					View
					<ArrowUpRight size={14} />
				</span>
			</div>

			{/* Fixed-height caption (WALL_CAPTION_PX, masonry math depends on it):
			    meta row with the price, then the title clamped to two lines. */}
			<div className="card-caption mt-3 h-[4.5rem] min-w-0">
				<div className="flex items-baseline justify-between gap-2">
					<p aria-hidden="true" className="t-meta min-w-0 truncate text-(length:--text-micro)">
						{index ? (
							<span className="max-sm:hidden">{`No. ${String(index).padStart(2, "0")} · `}</span>
						) : null}
						{artwork.style}
					</p>
					{priceSlot ? (
						<p className="t-numeral shrink-0 whitespace-nowrap text-sm lining-nums text-accent-text">
							{priceSlot}
						</p>
					) : null}
				</div>
				<h3 className="t-display mt-1 line-clamp-2 text-h3 text-ink transition-colors group-hover:text-accent-text">
					{artwork.title}
				</h3>
			</div>
			{position}
		</AnimatedLink>
	);
}

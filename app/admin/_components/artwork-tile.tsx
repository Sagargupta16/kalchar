"use client";

import { ArrowUpRight, Star } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { PRESS_SCALE, SPRING_PRESS } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { tileLabel } from "./artwork-list-state";
import { DOT } from "./artwork-quick-state";
import { adminStatusDot, adminTileBadge } from "./controls";

/** A painting and its inventory label stay together as one keyboard target. */
export function ArtworkTile({
	art,
	thumb,
	index,
	pending,
	highlighted,
	onEdit,
}: Readonly<{
	art: Artwork;
	thumb: string;
	index: number;
	pending: boolean;
	highlighted: boolean;
	onEdit: () => void;
}>) {
	const status = art.status ?? "archive";
	const descriptionId = useId();
	return (
		<motion.button
			type="button"
			onClick={onEdit}
			disabled={pending}
			aria-label={tileLabel(art, index)}
			aria-describedby={descriptionId}
			className={cn(
				"group flex h-full w-full flex-col overflow-hidden rounded-md border border-line bg-surface text-left shadow-e1 transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50",
				highlighted && "outline-2 outline-offset-2 outline-accent",
			)}
			whileHover={{ y: -4 }}
			whileTap={{ scale: PRESS_SCALE }}
			transition={SPRING_PRESS}
		>
			<span id={descriptionId} className="sr-only">
				{art.style}
				{art.priceInr != null && art.priceInr > 0 ? `, ${formatInr(art.priceInr)}` : ""}
			</span>
			<span className="relative block aspect-square w-full overflow-hidden bg-canvas">
				{/* biome-ignore lint/performance/noImgElement: admin thumbnail from the image seam */}
				<img
					src={thumb}
					alt=""
					loading={index < 6 ? "eager" : "lazy"}
					className="size-full object-contain p-2"
				/>
				<span aria-hidden="true" className={cn(adminTileBadge, "absolute top-2 left-2")}>
					{index + 1}
				</span>
				{art.featured ? (
					<span
						aria-hidden="true"
						className={cn(adminTileBadge, "absolute top-2 right-2 inline-flex items-center gap-1")}
					>
						<Star size={12} className="fill-current text-gold-leaf" />
						<span className="hidden sm:inline">Featured</span>
					</span>
				) : null}
			</span>
			<span aria-hidden="true" className="flex w-full flex-1 flex-col gap-1 p-(--card-pad-compact)">
				<span className="flex items-start justify-between gap-2">
					<span className="line-clamp-2 text-sm font-semibold leading-snug">{art.title}</span>
					<ArrowUpRight
						size={14}
						className="mt-1 shrink-0 text-muted transition-ui group-hover:text-accent-text"
					/>
				</span>
				<span className="text-label text-muted">{art.style}</span>
				<span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-label">
					<span className="inline-flex items-center gap-1.5">
						<span className={cn(adminStatusDot, "size-2", DOT[status])} />
						{artworkStatusLabel(status)}
					</span>
					{art.priceInr != null && art.priceInr > 0 ? (
						<span className="font-medium tabular-nums">{formatInr(art.priceInr)}</span>
					) : null}
				</span>
			</span>
		</motion.button>
	);
}

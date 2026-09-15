"use client";

import { Palette } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DUR, EASE_IN, gridStaggerDelay, REVEAL_DISTANCE, SPRING_LAYOUT } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { ArtworkCard } from "./artwork-card";
import { EAGER_CARD_COUNT, GalleryGrid } from "./gallery-grid";

interface WorkFilterResultsProps {
	items: readonly Artwork[];
	visible: readonly Artwork[];
	query: string;
	availableOnly: boolean;
	onClearSearch: () => void;
	onClearFilters: () => void;
}

const CARD_EXIT = {
	opacity: 0,
	scale: 0.96,
	transition: { duration: DUR.fast, ease: EASE_IN },
} as const;

function getEmptyStateCopy({
	items,
	query,
	availableOnly,
}: Pick<WorkFilterResultsProps, "items" | "query" | "availableOnly">) {
	if (items.length === 0) {
		return {
			title: "No artwork to show",
			body: "There are no pieces in the collection right now.",
		};
	}
	if (query.trim()) {
		return {
			title: "No pieces found",
			body: "Try a different title or medium, or clear the filters to explore the whole collection.",
		};
	}
	if (availableOnly) {
		return {
			title: "No available pieces in this selection",
			body: "Try another style, or explore the full collection.",
		};
	}
	return {
		title: "Nothing in this style yet",
		body: "Try another tradition, or see every piece.",
	};
}

export function WorkFilterResults({
	items,
	visible,
	query,
	availableOnly,
	onClearSearch,
	onClearFilters,
}: Readonly<WorkFilterResultsProps>) {
	// Catalogue positions and each initial card's wrapper stay stable under filtering.
	// Replacing an eager card with Reveal would disconnect the viewer's focus trigger.
	const indexBySlug = useMemo(() => new Map(items.map((item, i) => [item.slug, i + 1])), [items]);
	const eagerArtworkSlugs = useRef(
		new Set(visible.slice(0, EAGER_CARD_COUNT).map((art) => art.slug)),
	);

	if (visible.length === 0) {
		const copy = getEmptyStateCopy({ items, query, availableOnly });
		const hasQuery = Boolean(query.trim());
		return (
			<EmptyState
				className="mt-(--space-block)"
				icon={<Palette size={24} aria-hidden="true" />}
				{...copy}
				action={
					items.length > 0 ? (
						<button
							type="button"
							onClick={hasQuery ? onClearSearch : onClearFilters}
							className={buttonVariants({ variant: "secondary" })}
						>
							{hasQuery ? "Clear search" : "Show all pieces"}
						</button>
					) : undefined
				}
			/>
		);
	}

	return (
		<GalleryGrid className="mt-5">
			<AnimatePresence mode="popLayout" initial={false}>
				{visible.map((art, i) => {
					const eager = eagerArtworkSlugs.current.has(art.slug);
					const card = (
						<ArtworkCard
							artwork={art}
							siblings={visible}
							priority={i < 3}
							index={indexBySlug.get(art.slug)}
							total={items.length}
							unveilDelayMs={eager ? gridStaggerDelay(i) : undefined}
						/>
					);
					return (
						<motion.li
							key={art.slug}
							layout="position"
							className="min-w-0 [&>div]:h-full"
							transition={SPRING_LAYOUT}
							exit={CARD_EXIT}
						>
							{eager ? (
								card
							) : (
								<Reveal eager={false} distance={REVEAL_DISTANCE.item} delayMs={gridStaggerDelay(i)}>
									{card}
								</Reveal>
							)}
						</motion.li>
					);
				})}
			</AnimatePresence>
		</GalleryGrid>
	);
}

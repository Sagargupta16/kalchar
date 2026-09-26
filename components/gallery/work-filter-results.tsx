"use client";

import { Palette } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useMemo, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
	CARD_STAGGER_MS,
	DUR,
	EASE_IN,
	EASE_OUT,
	gridStaggerDelay,
	SPRING_LAYOUT,
} from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { ArtworkCard } from "./artwork-card";
import { EAGER_CARD_COUNT } from "./gallery-grid";
import "@/components/editorial/editorial.css";

interface WorkFilterResultsProps {
	items: readonly Artwork[];
	visible: readonly Artwork[];
	query: string;
	availableOnly: boolean;
	onClearSearch: () => void;
	onClearFilters: () => void;
}

/** Plate widths on the justified wall: two per row on phones, three to four from sm. */
const WALL_SIZES = "(min-width: 1024px) 22rem, (min-width: 640px) 34vw, calc((100vw - 52px) / 2)";

/** Cards a filter tap brings in rise and settle; the first render skips this (initial={false}). */
const CARD_ENTER = { opacity: 0, scale: 0.94, y: 24 } as const;
const CARD_REST = {
	opacity: 1,
	scale: 1,
	y: 0,
	transition: { duration: DUR.base, ease: EASE_OUT },
} as const;

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
		<ul className="art-wall mt-6 sm:mt-8">
			<AnimatePresence mode="popLayout" initial={false}>
				{visible.map((art, i) => {
					const eager = eagerArtworkSlugs.current.has(art.slug);
					return (
						<motion.li
							key={art.slug}
							layout="position"
							style={{ "--ar": art.aspectRatio } as CSSProperties}
							transition={SPRING_LAYOUT}
							initial={CARD_ENTER}
							animate={CARD_REST}
							exit={CARD_EXIT}
						>
							<ArtworkCard
								variant="wall"
								artwork={art}
								siblings={visible}
								priority={i < 3}
								sizes={WALL_SIZES}
								index={indexBySlug.get(art.slug)}
								total={items.length}
								unveilDelayMs={eager ? gridStaggerDelay(i) : undefined}
								revealDelayMs={(i % 3) * CARD_STAGGER_MS}
							/>
						</motion.li>
					);
				})}
			</AnimatePresence>
		</ul>
	);
}

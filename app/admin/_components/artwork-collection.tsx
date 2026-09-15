"use client";

import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/ui/empty-state";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { DUR, EASE_OUT, SPRING_LAYOUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAddSheet } from "./add-sheet";
import type { ArtworkListItem, PiecesFilter, PiecesView } from "./artwork-list-state";
import { ArtworkRow, type ArtworkRowProps } from "./artwork-row";
import { ArtworkTile } from "./artwork-tile";
import { adminBtn, adminBtnPrimary } from "./controls";

/** Crossfade on a view switch: opacity only, fast (Tier 1a motion). */
const VIEW_FADE = "starting:opacity-0 transition-opacity duration-(--duration-fast)";

interface ArtworkCollectionProps {
	total: number;
	visible: readonly { item: ArtworkListItem; index: number }[];
	query: string;
	filter: PiecesFilter;
	view: PiecesView;
	pending: boolean;
	highlight: string | null;
	dragging: number | null;
	onEdit: (slug: string) => void;
	onResetFilter: () => void;
	getRowProps: (item: ArtworkListItem, index: number) => ArtworkRowProps;
}

/** First-run primary: the add sheet is the single create entry (D-A5). */
function AddPieceButton() {
	const { openPiece } = useAddSheet();
	return (
		<button type="button" onClick={openPiece} className={adminBtnPrimary}>
			Add a piece
		</button>
	);
}

function emptyCollectionTitle(query: string, filter: PiecesFilter): string {
	if (query.trim()) return `No pieces match "${query.trim()}"`;
	const stateLabel =
		filter === "featured" || filter === "all"
			? "featured"
			: artworkStatusLabel(filter).toLowerCase();
	return `No ${stateLabel} pieces`;
}

/** The grid and rows share filtering, while reorder controls remain exclusive to rows. */
export function ArtworkCollection({
	total,
	visible,
	query,
	filter,
	view,
	pending,
	highlight,
	dragging,
	onEdit,
	onResetFilter,
	getRowProps,
}: Readonly<ArtworkCollectionProps>) {
	if (total === 0) {
		return (
			<EmptyState
				variant="default"
				voice="tool"
				title="No pieces yet"
				body="Add your first painting to open the gallery."
				action={<AddPieceButton />}
			/>
		);
	}
	if (visible.length === 0) {
		return (
			<EmptyState
				variant="compact"
				voice="tool"
				title={emptyCollectionTitle(query, filter)}
				action={
					<button type="button" onClick={onResetFilter} className={adminBtn}>
						Show all pieces
					</button>
				}
			/>
		);
	}
	if (view === "grid") {
		return (
			<ul
				key="grid"
				className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4", VIEW_FADE)}
			>
				<AnimatePresence initial={false} mode="popLayout">
					{visible.map(({ item, index }) => (
						<motion.li
							key={item.art.slug}
							id={`piece-${item.art.slug}`}
							layout="position"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96 }}
							transition={{
								layout: SPRING_LAYOUT,
								default: { duration: DUR.fast, ease: EASE_OUT },
							}}
						>
							<ArtworkTile
								art={item.art}
								thumb={item.thumb}
								index={index}
								pending={pending}
								highlighted={highlight === item.art.slug}
								onEdit={() => onEdit(item.art.slug)}
							/>
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
		);
	}
	return (
		<ul key="list" className={cn("space-y-tight", VIEW_FADE, dragging !== null && "select-none")}>
			{visible.map(({ item, index }) => (
				<ArtworkRow key={item.art.slug} {...getRowProps(item, index)} />
			))}
		</ul>
	);
}

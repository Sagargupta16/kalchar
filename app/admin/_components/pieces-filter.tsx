"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { cn } from "@/lib/utils";
import { PIECES_FILTERS, type PiecesFilter as PiecesFilterKey } from "./artwork-list-state";
import { adminBtn, adminField, adminHelp, adminIconBtnGhost, ICON_MD } from "./controls";

const FILTER_LABEL: Record<PiecesFilterKey, string> = {
	all: "All",
	available: artworkStatusLabel("available"),
	sold: artworkStatusLabel("sold"),
	archive: artworkStatusLabel("archive"),
	featured: "Featured",
};

interface PiecesFilterProps {
	query: string;
	onQuery: (query: string) => void;
	filter: PiecesFilterKey;
	onFilter: (filter: PiecesFilterKey) => void;
	counts: Record<PiecesFilterKey, number>;
	shown: number;
	total: number;
	/** True while a chip or search narrows the list, which disables reorder. */
	reorderLocked: boolean;
}

/**
 * Search field, five count chips and a live "Showing N of M" line above the
 * Pieces list. The chip row scrolls sideways on phones so it never becomes a
 * second sticky bar.
 */
export function PiecesFilter({
	query,
	onQuery,
	filter,
	onFilter,
	counts,
	shown,
	total,
	reorderLocked,
}: Readonly<PiecesFilterProps>) {
	const id = useId();
	return (
		<div className="mb-4 grid gap-3">
			<div className="relative">
				<Search
					size={ICON_MD}
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
				/>
				<input
					id={id}
					type="search"
					inputMode="search"
					enterKeyHint="search"
					autoComplete="off"
					aria-label="Find a piece"
					placeholder="Search by title or category"
					value={query}
					onChange={(event) => onQuery(event.target.value)}
					className={cn(adminField, "pl-10")}
				/>
				{query ? (
					<button
						type="button"
						onClick={() => onQuery("")}
						aria-label="Clear search"
						className={cn(adminIconBtnGhost, "absolute top-1/2 right-0 -translate-y-1/2")}
					>
						<X size={ICON_MD} aria-hidden="true" />
					</button>
				) : null}
			</div>
			<div role="group" aria-label="Show" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
				{PIECES_FILTERS.map((key) => (
					<button
						key={key}
						type="button"
						aria-pressed={filter === key}
						onClick={() => onFilter(key)}
						className={cn(adminBtn, "group shrink-0 rounded-full")}
					>
						{FILTER_LABEL[key]}
						<span className="tabular-nums text-muted group-aria-pressed:text-inherit">
							{counts[key]}
						</span>
					</button>
				))}
			</div>
			<p role="status" className={adminHelp}>
				{shown === total ? `${total} pieces` : `Showing ${shown} of ${total} pieces`}
				{reorderLocked ? " Show all pieces to change the order." : ""}
			</p>
		</div>
	);
}

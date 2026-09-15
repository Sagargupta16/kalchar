"use client";

import { LayoutGrid, Rows3, Search, X } from "lucide-react";
import { useId, useRef } from "react";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { cn } from "@/lib/utils";
import {
	PIECES_FILTERS,
	type PiecesFilter as PiecesFilterKey,
	type PiecesView,
} from "./artwork-list-state";
import {
	adminBtn,
	adminField,
	adminHelp,
	adminIconBtn,
	adminIconBtnGhost,
	ICON_MD,
} from "./controls";

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
	view: PiecesView;
	onView: (view: PiecesView) => void;
}

/**
 * Search field, five count chips (the stats, now tappable filters), and the
 * count line with the grid/list view toggle at its right end. The chip row
 * scrolls sideways on phones so it never becomes a second sticky bar. In grid
 * view the count line carries the reorder hint (ordering lives in list view).
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
	view,
	onView,
}: Readonly<PiecesFilterProps>) {
	const id = useId();
	const search = useRef<HTMLInputElement>(null);
	const totalLabel = `${total} piece${total === 1 ? "" : "s"}`;
	const hint =
		view === "grid"
			? " Switch to list view to change the order."
			: reorderLocked
				? " Show all pieces to change the order."
				: "";
	return (
		<div className="mb-(--space-group) grid gap-(--space-tight)">
			<div className="relative">
				<Search
					size={ICON_MD}
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
				/>
				<input
					id={id}
					ref={search}
					type="search"
					inputMode="search"
					enterKeyHint="search"
					autoComplete="off"
					aria-label="Find a piece"
					placeholder="Search title, category or medium"
					value={query}
					onChange={(event) => onQuery(event.target.value)}
					className={cn(
						adminField,
						"pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none",
					)}
				/>
				{query ? (
					<button
						type="button"
						onClick={() => {
							onQuery("");
							search.current?.focus();
						}}
						aria-label="Clear search"
						className={cn(adminIconBtnGhost, "absolute top-1/2 right-0 -translate-y-1/2")}
					>
						<X size={ICON_MD} aria-hidden="true" />
					</button>
				) : null}
			</div>
			<div
				role="group"
				aria-label="Show"
				className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
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
			<div className="flex items-center justify-between gap-3">
				<p role="status" className={cn(adminHelp, "flex flex-col gap-1")}>
					<span className="font-medium text-ink">
						{shown === total ? totalLabel : `Showing ${shown} of ${totalLabel}`}
					</span>
					{hint ? <span>{hint.trim()}</span> : null}
				</p>
				{/* A view preference, not a value: aria-pressed buttons, not the radio Segmented. */}
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						aria-pressed={view === "grid"}
						aria-label="Grid view"
						onClick={() => onView("grid")}
						className={adminIconBtn}
					>
						<LayoutGrid size={ICON_MD} aria-hidden="true" />
					</button>
					<button
						type="button"
						aria-pressed={view === "list"}
						aria-label="List view"
						onClick={() => onView("list")}
						className={adminIconBtn}
					>
						<Rows3 size={ICON_MD} aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>
	);
}

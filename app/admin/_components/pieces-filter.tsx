"use client";

import { LayoutGrid, Rows3, Search, X } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useId, useRef } from "react";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { SPRING_INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
	PIECES_FILTERS,
	type PiecesFilter as PiecesFilterKey,
	type PiecesView,
} from "./artwork-list-state";
import { adminField, adminHelp, adminIconBtnGhost, ICON_MD } from "./controls";
import { FilterTabs } from "./filter-tabs";

const FILTER_LABEL: Record<PiecesFilterKey, string> = {
	all: "All",
	available: artworkStatusLabel("available"),
	sold: artworkStatusLabel("sold"),
	archive: artworkStatusLabel("archive"),
	featured: "Featured",
};

function reorderHint(view: PiecesView, reorderLocked: boolean): string {
	if (view === "grid") return "Switch to list view to change the order.";
	if (reorderLocked) return "Show all pieces to change the order.";
	return "";
}

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

const VIEWS = [
	{ value: "grid", label: "Grid view", icon: LayoutGrid },
	{ value: "list", label: "List view", icon: Rows3 },
] as const;

/**
 * Grid / list toggle as a compact segmented track matching FilterTabs: a view
 * preference, not a value, so aria-pressed buttons rather than the radio
 * Segmented. The white thumb slides between the two on SPRING_INDICATOR.
 */
function ViewToggle({
	view,
	onView,
}: Readonly<{ view: PiecesView; onView: (view: PiecesView) => void }>) {
	const layoutId = useId();
	return (
		<LayoutGroup id={layoutId}>
			<div className="inline-flex shrink-0 gap-1 rounded-(--radius-md) bg-bg-muted p-1 ring-1 ring-line dark:bg-canvas">
				{VIEWS.map(({ value, label, icon: Icon }) => {
					const selected = view === value;
					return (
						<button
							key={value}
							type="button"
							aria-pressed={selected}
							aria-label={label}
							onClick={() => onView(value)}
							className={cn(
								"relative isolate grid size-control place-items-center rounded-(--radius-sm) transition-colors pressable",
								selected ? "text-ink" : "text-muted hover:bg-surface-hover hover:text-ink",
							)}
						>
							{selected ? (
								<motion.span
									layoutId="view-toggle-thumb"
									aria-hidden="true"
									className="absolute inset-0 -z-10 rounded-(--radius-sm) bg-surface shadow-e2-edged dark:bg-surface-raised"
									transition={SPRING_INDICATOR}
								/>
							) : null}
							<Icon size={ICON_MD} aria-hidden="true" />
						</button>
					);
				})}
			</div>
		</LayoutGroup>
	);
}

/**
 * Search field, then the segmented lens control (the five filters with their
 * counts) beside the view toggle, then the count line. The lens track scrolls
 * sideways on phones so it never wraps into a second row. In grid view the
 * count line carries the reorder hint (ordering lives in list view).
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
	const hint = reorderHint(view, reorderLocked);
	return (
		<div className="mb-(--space-group) grid gap-3">
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
			{/* Phones: the tabs get the full width and the view toggle drops beside
			    the count; from sm the toggle sits at the end of the tab row. */}
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
				<FilterTabs
					label="Show"
					value={filter}
					onChange={onFilter}
					options={PIECES_FILTERS.map((key) => ({
						key,
						label: FILTER_LABEL[key],
						count: counts[key],
					}))}
					className="col-span-2 min-w-0 sm:col-span-1"
				/>
				<div className="col-start-2 row-start-2 sm:row-start-1">
					<ViewToggle view={view} onView={onView} />
				</div>
				<output
					className={cn(
						adminHelp,
						"col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-2",
					)}
				>
					<span className="font-medium text-ink tabular-nums">
						{shown === total ? totalLabel : `Showing ${shown} of ${totalLabel}`}
					</span>
					{hint ? (
						<>
							<span aria-hidden="true" className="text-line-strong">
								/
							</span>
							<span>{hint}</span>
						</>
					) : null}
				</output>
			</div>
		</div>
	);
}

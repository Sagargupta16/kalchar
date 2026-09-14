"use client";

import { Star } from "lucide-react";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useOptimistic,
	useRef,
	useState,
} from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import { artworkStatusLabel } from "@/lib/artwork-status";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	deleteArtwork,
	reorderArtworks,
	setArtworkFeatured,
	setArtworkStatus,
} from "../artwork-actions";
import { useAddSheet } from "./add-sheet";
import { AdminNotice } from "./admin-notice";
import { ArtworkEditModal, type ArtworkPatch, DELETE_PIECE_BODY } from "./artwork-edit-modal";
import {
	type ArtworkListItem,
	applyStagedOrder,
	type ErrorTarget,
	isPiecesView,
	matchesFilter,
	type OptimisticPatch,
	type Patch,
	PIECES_VIEW_KEY,
	type PiecesFilter,
	type PiecesView,
	patchList,
	STATUS_MESSAGE,
	tileLabel,
} from "./artwork-list-state";
import { DOT } from "./artwork-quick-state";
import { ArtworkRow } from "./artwork-row";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnPrimary, adminStatusDot, adminTileBadge } from "./controls";
import { PiecesFilter as PiecesFilterBar } from "./pieces-filter";
import { ReorderBar } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

export type { ArtworkListItem, PiecesFilter } from "./artwork-list-state";

/** Crossfade on a view switch: opacity only, fast (Tier 1a motion). */
const VIEW_FADE =
	"starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-fast)";

/** First-run primary: the add sheet is the single create entry (D-A5). */
function AddPieceButton() {
	const { openPiece } = useAddSheet();
	return (
		<button type="button" onClick={openPiece} className={adminBtnPrimary}>
			Add a piece
		</button>
	);
}

interface ArtworkGridProps {
	items: ArtworkListItem[];
	categories: readonly string[];
	counts: Record<PiecesFilter, number>;
	initialFilter?: PiecesFilter;
}

/**
 * The one Pieces surface: search and count chips, the paintings grid (the
 * phone default, D-A13) or the list rows, the reorder bar or the undo bar in
 * the bottom slot, and the editor mounted once. Quick states are optimistic
 * and reversible (D26, D37); deletes and the reorder save are not. Reorder
 * lives in list view; tiles only browse and edit.
 */
export function ArtworkGrid({
	items: initial,
	categories,
	counts,
	initialFilter = "all",
}: Readonly<ArtworkGridProps>) {
	const confirm = useConfirm();
	const reduce = usePrefersReducedMotion();
	const { pending, err, run } = useAdminAction();
	// Baseline = the last server-known order. Reset returns to it; deletes and
	// quick states move it too, so neither reads as an unsaved reorder.
	const [baseline, setBaseline] = useState(initial);
	const [highlight, setHighlight] = useState<string | null>(null);
	// onResync runs inside the hook call below, before its own setter exists in
	// this scope; the ref carries the (stable) setter across renders.
	const setItemsRef = useRef<Dispatch<SetStateAction<ArtworkListItem[]>> | null>(null);
	const [items, setItems] = useServerSyncedList(initial, (fresh, previous) => {
		// A quick state's router.refresh() must not drop a staged, unsaved order.
		const staged = previous.some((item, i) => item.art.slug !== baseline[i]?.art.slug);
		setBaseline(fresh);
		if (staged) {
			setItemsRef.current?.(
				applyStagedOrder(
					fresh,
					previous.map((item) => item.art.slug),
				),
			);
		}
		const known = new Set(previous.map((item) => item.art.slug));
		const added = fresh.filter((item) => !known.has(item.art.slug));
		if (added.length === 1) setHighlight(added[0]?.art.slug ?? null);
	});
	setItemsRef.current = setItems;

	const [optimistic, applyOptimistic] = useOptimistic(
		items,
		(state: ArtworkListItem[], { slug, ...patch }: OptimisticPatch) =>
			patchList(state, slug, patch),
	);
	const [rowBusy, setRowBusy] = useState<string | null>(null);
	const [errorTarget, setErrorTarget] = useState<ErrorTarget | null>(null);
	const [editing, setEditing] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<PiecesFilter>(initialFilter);
	const [seenInitialFilter, setSeenInitialFilter] = useState(initialFilter);
	// Grid is the default (D-A13); the stored preference arrives after mount so
	// the server render never mismatches.
	const [view, setView] = useState<PiecesView>("grid");
	if (initialFilter !== seenInitialFilter) {
		// A stat-chip link changes the filter without remounting the grid (staged order survives).
		setSeenInitialFilter(initialFilter);
		setFilter(initialFilter);
	}

	useEffect(() => {
		// The harness page has an opaque origin where storage access can throw.
		try {
			const stored = window.localStorage.getItem(PIECES_VIEW_KEY);
			if (isPiecesView(stored)) setView(stored);
		} catch {
			// No storage: the session keeps the grid default.
		}
	}, []);

	const changeView = (next: PiecesView) => {
		setView(next);
		try {
			window.localStorage.setItem(PIECES_VIEW_KEY, next);
		} catch {
			// No storage: the preference lives for this page only.
		}
	};

	const filtered = filter !== "all" || query.trim() !== "";
	// Reorder is a list-view job: tiles never move (D-A11).
	const reorderLocked = pending || filtered || view === "grid";
	const { dragging, over, dragProps, move } = useReorder(items, setItems, reorderLocked);
	const hasChanges = items.some((item, i) => item.art.slug !== baseline[i]?.art.slug);
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(run);

	useEffect(() => {
		if (!saved) return;
		const id = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [saved]);

	useEffect(() => {
		if (!notice) return;
		const id = window.setTimeout(() => setNotice(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [notice]);

	// A piece just added lands at the end of the list: bring it into view and mark it briefly.
	useEffect(() => {
		if (!highlight) return;
		document
			.getElementById(`piece-${highlight}`)
			?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
		const id = window.setTimeout(() => setHighlight(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [highlight, reduce]);

	const commitPatch = (slug: string, patch: Partial<Artwork>) => {
		setItems((list) => patchList(list, slug, patch));
		setBaseline((list) => patchList(list, slug, patch));
	};

	const removeRow = (item: ArtworkListItem) => {
		setItems((list) => list.filter((i) => i.art.slug !== item.art.slug));
		setBaseline((list) => list.filter((i) => i.art.slug !== item.art.slug));
		setNotice(`"${item.art.title}" deleted`);
	};

	/**
	 * One optimistic, reversible quick state. The patch flips inside run()'s
	 * transition and reverts by itself on failure; success commits it locally
	 * and offers the reverse action in the undo bar (one offer at a time).
	 */
	const quick = (
		item: ArtworkListItem,
		patch: Patch,
		action: () => Promise<unknown>,
		message: string,
		reversePatch: Patch,
		reverse: () => Promise<unknown>,
	) => {
		const slug = item.art.slug;
		setErrorTarget({ kind: "row", slug });
		setRowBusy(slug);
		return run(
			async () => {
				applyOptimistic({ slug, ...patch });
				return action();
			},
			() => commitPatch(slug, patch),
		).then((ok) => {
			setRowBusy(null);
			if (ok) {
				offerUndo({
					message,
					// The raw action, never quick()/run(): useUndo hands it to this grid's run.
					action: async () => {
						applyOptimistic({ slug, ...reversePatch });
						const result = await reverse();
						if (!isFailure(result)) commitPatch(slug, reversePatch);
						return result;
					},
				});
			}
			return ok;
		});
	};

	const onSetStatus = (item: ArtworkListItem, status: ArtworkStatus) => {
		const previous = item.art.status ?? "archive";
		const slug = item.art.slug;
		return quick(
			item,
			{ status },
			() => setArtworkStatus(slug, status),
			`"${item.art.title}" ${STATUS_MESSAGE[status]}`,
			{ status: previous },
			() => setArtworkStatus(slug, previous),
		);
	};

	const onSetFeatured = (item: ArtworkListItem, featured: boolean) => {
		const slug = item.art.slug;
		return quick(
			item,
			{ featured },
			() => setArtworkFeatured(slug, featured),
			`"${item.art.title}" ${featured ? "featured on home" : "no longer featured"}`,
			{ featured: !featured },
			() => setArtworkFeatured(slug, !featured),
		);
	};

	const onUndo = () => {
		setErrorTarget({ kind: "undo" });
		return undoNow();
	};

	const handleDelete = async (item: ArtworkListItem) => {
		const ok = await confirm({
			title: `Delete "${item.art.title}"?`,
			body: DELETE_PIECE_BODY,
			confirmLabel: "Delete piece",
			cancelLabel: "Keep piece",
		});
		if (!ok) return;
		setErrorTarget({ kind: "row", slug: item.art.slug });
		setRowBusy(item.art.slug);
		await run(
			() => deleteArtwork(item.art.slug),
			() => removeRow(item),
		);
		setRowBusy(null);
	};

	const handleSave = () => {
		setErrorTarget({ kind: "list" });
		setSaved(false);
		return run(
			() => reorderArtworks(items.map((item) => item.art.slug)),
			() => {
				setBaseline(items);
				setSaved(true);
			},
		);
	};

	const handleReset = () => {
		setErrorTarget(null);
		setItems(baseline);
	};

	const resetFilter = () => {
		setQuery("");
		setFilter("all");
	};

	const rowPending = (slug: string) => pending && (rowBusy === null || rowBusy === slug);
	const rowError = (slug: string) =>
		errorTarget?.kind === "row" && errorTarget.slug === slug ? err : null;
	const visible = optimistic
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => matchesFilter(item.art, filter, query));
	const editingItem = editing ? optimistic.find((item) => item.art.slug === editing) : undefined;
	const stateLabel =
		filter === "featured" || filter === "all"
			? "featured"
			: artworkStatusLabel(filter).toLowerCase();

	return (
		<>
			{optimistic.length > 0 ? (
				<PiecesFilterBar
					query={query}
					onQuery={setQuery}
					filter={filter}
					onFilter={setFilter}
					counts={counts}
					shown={visible.length}
					total={optimistic.length}
					reorderLocked={filtered}
					view={view}
					onView={changeView}
				/>
			) : null}
			{notice ? (
				<AdminNotice variant="success" className="mb-3">
					{notice}
				</AdminNotice>
			) : null}
			{optimistic.length === 0 ? (
				<EmptyState
					variant="default"
					voice="tool"
					title="No pieces yet"
					body="Add your first painting to open the gallery."
					action={<AddPieceButton />}
				/>
			) : visible.length === 0 ? (
				<EmptyState
					variant="compact"
					voice="tool"
					title={query ? `No pieces match "${query}"` : `No ${stateLabel} pieces`}
					action={
						<button type="button" onClick={resetFilter} className={adminBtn}>
							Show all pieces
						</button>
					}
				/>
			) : view === "grid" ? (
				<ul
					key="grid"
					className={cn("grid grid-cols-3 gap-(--grid-gap-tight) xl:grid-cols-6", VIEW_FADE)}
				>
					{visible.map(({ item, index }) => (
						<li key={item.art.slug} id={`piece-${item.art.slug}`}>
							<button
								type="button"
								onClick={() => setEditing(item.art.slug)}
								disabled={rowPending(item.art.slug)}
								aria-label={tileLabel(item.art, index)}
								className={cn(
									"group relative block aspect-square w-full overflow-hidden bg-canvas pressable [-webkit-touch-callout:none] disabled:pointer-events-none disabled:opacity-50",
									highlight === item.art.slug && "ring-2 ring-accent ring-inset",
								)}
							>
								{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
								<img src={item.thumb} alt="" className="size-full object-cover" />
								<span aria-hidden="true" className={cn(adminTileBadge, "absolute top-1 left-1")}>
									{index + 1}
								</span>
								<span
									aria-hidden="true"
									className={cn(
										adminStatusDot,
										"absolute bottom-1.5 left-1.5 size-2.5",
										DOT[item.art.status ?? "archive"],
									)}
								/>
								{item.art.featured ? (
									<span className={cn(adminTileBadge, "absolute right-1 bottom-1")}>
										<Star size={12} aria-hidden="true" className="fill-current text-gold-leaf" />
									</span>
								) : null}
							</button>
						</li>
					))}
				</ul>
			) : (
				<ul
					key="list"
					className={cn("space-y-tight", VIEW_FADE, dragging !== null && "select-none")}
				>
					{visible.map(({ item, index }) => (
						<ArtworkRow
							key={item.art.slug}
							art={item.art}
							thumb={item.thumb}
							index={index}
							pending={rowPending(item.art.slug)}
							reorderHandle={
								<ReorderHandle
									label={item.art.title}
									index={index}
									count={optimistic.length}
									disabled={rowPending(item.art.slug) || filtered}
									onMove={(to) => move(index, to)}
								/>
							}
							dragProps={dragProps(index)}
							dragging={dragging === index}
							over={over === index}
							highlighted={highlight === item.art.slug}
							onEdit={() => setEditing(item.art.slug)}
							onDelete={() => handleDelete(item)}
							onSetStatus={(status) => onSetStatus(item, status)}
							onSetFeatured={(featured) => onSetFeatured(item, featured)}
							error={rowError(item.art.slug)}
						/>
					))}
				</ul>
			)}

			{hasChanges || saved ? (
				<ReorderBar
					label="Gallery order changed"
					pending={pending}
					saved={saved}
					error={errorTarget?.kind === "list" ? err : null}
					onSave={handleSave}
					onReset={handleReset}
				/>
			) : undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError ? (err ?? undoError) : null}
					onAction={onUndo}
					onDismiss={dismissUndo}
				/>
			) : null}

			{editingItem ? (
				<ArtworkEditModal
					art={editingItem.art}
					thumb={editingItem.thumb}
					categories={categories}
					quickPending={rowPending(editingItem.art.slug)}
					quickError={rowError(editingItem.art.slug)}
					onSetStatus={(status) => onSetStatus(editingItem, status)}
					onSetFeatured={(featured) => onSetFeatured(editingItem, featured)}
					onClose={() => setEditing(null)}
					onSaved={(patch: ArtworkPatch) => commitPatch(editingItem.art.slug, patch)}
					onDeleted={() => {
						removeRow(editingItem);
						setEditing(null);
					}}
				/>
			) : null}
		</>
	);
}

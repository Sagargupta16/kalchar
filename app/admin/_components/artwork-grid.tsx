"use client";

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
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	deleteArtwork,
	reorderArtworks,
	setArtworkFeatured,
	setArtworkStatus,
} from "../artwork-actions";
import { AdminNotice } from "./admin-notice";
import { ArtworkEditModal, type ArtworkPatch, DELETE_PIECE_BODY } from "./artwork-edit-modal";
import {
	type ArtworkListItem,
	applyStagedOrder,
	type ErrorTarget,
	matchesFilter,
	type OptimisticPatch,
	type Patch,
	type PiecesFilter,
	patchList,
	STATUS_MESSAGE,
} from "./artwork-list-state";
import { ArtworkRow } from "./artwork-row";
import { useConfirm } from "./confirm-dialog";
import { adminBtn } from "./controls";
import { PiecesFilter as PiecesFilterBar } from "./pieces-filter";
import { ReorderBar } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

export type { ArtworkListItem, PiecesFilter } from "./artwork-list-state";

interface ArtworkGridProps {
	items: ArtworkListItem[];
	categories: readonly string[];
	counts: Record<PiecesFilter, number>;
	initialFilter?: PiecesFilter;
}

/**
 * The one Pieces list: search and chips, one R6 row per piece, the reorder
 * bar or the undo bar in the bottom slot, and the editor mounted once. Quick
 * states are optimistic and reversible (D26, D37); deletes and the reorder
 * save are not.
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
	if (initialFilter !== seenInitialFilter) {
		// A stat-card link changes the chip without remounting the grid (staged order survives).
		setSeenInitialFilter(initialFilter);
		setFilter(initialFilter);
	}

	const filtered = filter !== "all" || query.trim() !== "";
	const { dragging, over, dragProps, move } = useReorder(items, setItems, pending || filtered);
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
				/>
			) : null}
			{notice ? (
				<AdminNotice variant="success" className="mb-3">
					{notice}
				</AdminNotice>
			) : null}
			<ul className={cn("space-y-tight", dragging !== null && "select-none")}>
				{optimistic.length === 0 ? (
					<EmptyState
						as="li"
						variant="compact"
						voice="tool"
						title="No pieces yet"
						body="Add your first piece and it will appear here, ready to reorder and edit."
						action={
							<a href="#add-piece" className={adminBtn}>
								Add a piece
							</a>
						}
					/>
				) : visible.length === 0 ? (
					<EmptyState
						as="li"
						variant="nested"
						voice="tool"
						title="No pieces match"
						body={
							query
								? `Nothing matches "${query}". Try the title or the category.`
								: "No pieces with this status yet."
						}
						action={
							<button type="button" onClick={resetFilter} className={adminBtn}>
								Show all pieces
							</button>
						}
					/>
				) : (
					visible.map(({ item, index }) => (
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
					))
				)}
			</ul>

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

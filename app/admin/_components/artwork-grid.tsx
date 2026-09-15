"use client";

import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useOptimistic,
	useRef,
	useState,
} from "react";
import { isFailure } from "@/lib/action-result";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import {
	deleteArtwork,
	reorderArtworks,
	setArtworkFeatured,
	setArtworkStatus,
} from "../artwork-actions";
import { AdminNotice } from "./admin-notice";
import { ArtworkCollection } from "./artwork-collection";
import { ArtworkEditModal, type ArtworkPatch, DELETE_PIECE_BODY } from "./artwork-edit-modal";
import {
	type ArtworkListItem,
	applyStagedOrder,
	countPieces,
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
} from "./artwork-list-state";
import { useConfirm } from "./confirm-dialog";
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
	initialFilter = "all",
}: Readonly<ArtworkGridProps>) {
	const confirm = useConfirm();
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
			?.scrollIntoView({ block: "center", behavior: "smooth" });
		const id = window.setTimeout(() => setHighlight(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [highlight]);

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
		return run(
			async () => {
				setErrorTarget({ kind: "row", slug });
				applyOptimistic({ slug, ...patch });
				return action();
			},
			() => commitPatch(slug, patch),
		).then((ok) => {
			if (ok) {
				offerUndo({
					message,
					// The raw action, never quick()/run(): useUndo hands it to this grid's run.
					action: async () => {
						setErrorTarget({ kind: "undo" });
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

	const handleDelete = async (item: ArtworkListItem) => {
		if (pending) return;
		const ok = await confirm({
			title: `Delete "${item.art.title}"?`,
			body: DELETE_PIECE_BODY,
			confirmLabel: "Delete piece",
			cancelLabel: "Keep piece",
		});
		if (!ok) return;
		await run(
			() => {
				setErrorTarget({ kind: "row", slug: item.art.slug });
				return deleteArtwork(item.art.slug);
			},
			() => removeRow(item),
		);
	};

	const handleSave = () => {
		return run(
			() => {
				setErrorTarget({ kind: "list" });
				setSaved(false);
				return reorderArtworks(items.map((item) => item.art.slug));
			},
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

	const rowError = (slug: string) =>
		errorTarget?.kind === "row" && errorTarget.slug === slug ? err : null;
	const visible = optimistic
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => matchesFilter(item.art, filter, query));
	const hiddenRowError =
		errorTarget?.kind === "row" &&
		(view !== "list" || !visible.some(({ item }) => item.art.slug === errorTarget.slug))
			? err
			: null;
	const editingItem = editing ? optimistic.find((item) => item.art.slug === editing) : undefined;

	return (
		<>
			{optimistic.length > 0 ? (
				<PiecesFilterBar
					query={query}
					onQuery={setQuery}
					filter={filter}
					onFilter={setFilter}
					counts={countPieces(optimistic)}
					shown={visible.length}
					total={optimistic.length}
					reorderLocked={filtered}
					view={view}
					onView={changeView}
				/>
			) : null}
			{hiddenRowError ? (
				<AdminNotice variant="error" className="mb-3">
					{hiddenRowError}
				</AdminNotice>
			) : null}
			{notice ? (
				<AdminNotice variant="success" className="mb-3">
					{notice}
				</AdminNotice>
			) : null}
			<ArtworkCollection
				total={optimistic.length}
				visible={visible}
				query={query}
				filter={filter}
				view={view}
				pending={pending}
				highlight={highlight}
				dragging={dragging}
				onEdit={setEditing}
				onResetFilter={resetFilter}
				getRowProps={(item, index) => ({
					art: item.art,
					thumb: item.thumb,
					index,
					pending,
					reorderHandle: (
						<ReorderHandle
							label={item.art.title}
							index={index}
							count={optimistic.length}
							disabled={pending || filtered}
							onMove={(to) => move(index, to)}
						/>
					),
					dragProps: dragProps(index),
					dragging: dragging === index,
					over: over === index,
					highlighted: highlight === item.art.slug,
					onEdit: () => setEditing(item.art.slug),
					onDelete: () => handleDelete(item),
					onSetStatus: (status) => onSetStatus(item, status),
					onSetFeatured: (featured) => onSetFeatured(item, featured),
					error: rowError(item.art.slug),
				})}
			/>

			<ArtworkGridFooter
				hasChanges={hasChanges}
				saved={saved}
				pending={pending}
				err={err}
				errorTarget={errorTarget}
				onSave={handleSave}
				onReset={handleReset}
				undo={undo}
				undoPending={undoPending}
				undoError={undoError}
				undoNow={undoNow}
				dismissUndo={dismissUndo}
			/>

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

type ArtworkGridFooterProps = Pick<
	ReturnType<typeof useUndo>,
	"undo" | "undoPending" | "undoError" | "undoNow" | "dismissUndo"
> & {
	hasChanges: boolean;
	saved: boolean;
	pending: boolean;
	err: string | null;
	errorTarget: ErrorTarget | null;
	onSave: () => void;
	onReset: () => void;
};

function ArtworkGridFooter({
	hasChanges,
	saved,
	pending,
	err,
	errorTarget,
	onSave,
	onReset,
	undo,
	undoPending,
	undoError,
	undoNow,
	dismissUndo,
}: Readonly<ArtworkGridFooterProps>) {
	if (hasChanges || saved) {
		return (
			<ReorderBar
				label="Gallery order changed"
				pending={pending}
				saved={saved}
				error={errorTarget?.kind === "list" ? err : null}
				onSave={onSave}
				onReset={onReset}
			/>
		);
	}
	if (!undo) return null;
	return (
		<UndoBar
			message={undo.message}
			pending={pending || undoPending}
			error={undoError ? (err ?? undoError) : null}
			onAction={undoNow}
			onDismiss={dismissUndo}
		/>
	);
}

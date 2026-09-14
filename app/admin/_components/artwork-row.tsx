"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { isForSale } from "@/lib/catalog";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import {
	artworkStatusHelper,
	FeaturedToggle,
	useArtworkStatusOptions,
} from "./artwork-quick-state";
import { adminIconBtnDestructive, adminRow, adminThumb, adminTileBadge, ICON_MD } from "./controls";
import { Segmented } from "./segmented";

export interface ArtworkRowProps {
	art: Artwork;
	thumb: string;
	/** Position in the full gallery order (not the filtered view). */
	index: number;
	/** Row-level busy flag: list save, delete or a quick state in flight for THIS row. */
	pending: boolean;
	/** The shared ReorderHandle, rendered by the grid so it owns move()/count. */
	reorderHandle: ReactNode;
	dragProps: React.LiHTMLAttributes<HTMLLIElement>;
	dragging: boolean;
	over: boolean;
	highlighted: boolean;
	onEdit: () => void;
	onDelete: () => void;
	/** Optimistic quick states; the grid persists them. */
	onSetStatus: (status: ArtworkStatus) => void;
	onSetFeatured: (featured: boolean) => void;
	/** Row-scoped error from the last quick state or delete attempt. */
	error: string | null;
}

/**
 * The list-view row (1.11): one grid recipe, grip + Edit body + fixed action
 * cluster (star, hairline divider, Delete) on line 1, the Segmented status
 * control full width on line 2. At @xl/row everything joins one line with the
 * segmented control between the body and the star. Delete always sits at the
 * far end behind the divider with 16px of clear space (1.10).
 */
export function ArtworkRow({
	art,
	thumb,
	index,
	pending,
	reorderHandle,
	dragProps,
	dragging,
	over,
	highlighted,
	onEdit,
	onDelete,
	onSetStatus,
	onSetFeatured,
	error,
}: Readonly<ArtworkRowProps>) {
	const statusOptions = useArtworkStatusOptions(art.priceInr);
	const status = art.status ?? "archive";
	return (
		<li
			id={`piece-${art.slug}`}
			{...dragProps}
			className={cn(
				adminRow,
				"@container/row scroll-mt-(--header-h-shrunk)",
				dragging && "scale-[0.98] opacity-60 shadow-e3 select-none",
				over && !dragging && "border-accent shadow-e1",
				highlighted && "border-accent",
			)}
		>
			<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 @xl/row:grid-cols-[auto_minmax(0,1fr)_minmax(0,20rem)_auto]">
				{reorderHandle}
				<button
					type="button"
					onClick={onEdit}
					disabled={pending}
					aria-label={`Edit ${art.title}`}
					className="flex min-h-control min-w-0 items-center gap-3 rounded-(--radius-sm) text-left transition-ui pressable hover:text-accent-text disabled:pointer-events-none disabled:opacity-50"
				>
					<span className="relative shrink-0">
						{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
						<img src={thumb} alt="" className={cn(adminThumb, "size-14 @xl/row:size-16")} />
						<span aria-hidden="true" className={cn(adminTileBadge, "absolute top-1 left-1")}>
							{index + 1}
						</span>
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-medium text-ink">{art.title}</span>
						<span className="mt-1 flex items-baseline gap-2 text-label text-muted">
							<span className="min-w-0 truncate">{art.style}</span>
							{isForSale(art) ? (
								<span className="shrink-0 tabular-nums text-ink-soft">
									{formatInr(art.priceInr as number)}
								</span>
							) : null}
						</span>
						<span className="sr-only">
							, position {index + 1}
							{art.featured ? ", featured" : ""}
						</span>
					</span>
					<Pencil size={ICON_MD} aria-hidden="true" className="shrink-0 text-muted" />
				</button>
				{/* Line 2 on phones; joins line 1 between the body and the star at @xl/row. */}
				<Segmented
					name={art.slug}
					label={`Status of ${art.title}`}
					value={status}
					options={statusOptions}
					disabled={pending}
					helper={artworkStatusHelper(status)}
					onChange={onSetStatus}
					className="col-span-3 mt-3 @xl/row:col-span-1 @xl/row:col-start-3 @xl/row:row-start-1 @xl/row:mt-0"
				/>
				<div className="col-start-3 row-start-1 flex items-center self-center justify-self-end @xl/row:col-start-4">
					<FeaturedToggle
						title={art.title}
						featured={art.featured}
						disabled={pending}
						onChange={onSetFeatured}
					/>
					<span aria-hidden="true" className="mx-4 h-6 border-l border-line" />
					<button
						type="button"
						disabled={pending}
						onClick={onDelete}
						aria-label={`Delete ${art.title}`}
						className={adminIconBtnDestructive}
					>
						<Trash2 size={ICON_MD} aria-hidden="true" />
					</button>
				</div>
			</div>
			{error ? (
				<AdminNotice variant="error" className="mt-3">
					{error}
				</AdminNotice>
			) : null}
		</li>
	);
}

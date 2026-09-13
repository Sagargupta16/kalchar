"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { isForSale } from "@/lib/catalog";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { FeaturedToggle, StatusChip } from "./artwork-quick-state";
import { adminIconBtnDestructive, adminRow, adminThumb, ICON_MD } from "./controls";

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
 * The R6 row (D15): grip, Edit body (thumbnail with its position, title, meta),
 * status chip, Featured toggle, divider, Delete. Reading order and DOM order
 * match. The `@container/row` query decides one line (desktop column) or two
 * (phones); Delete always sits at the far end behind a hairline with 16px of
 * clear space, so a thumb cannot slip from Edit to Delete.
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
			<div className="flex flex-col gap-4 @xl/row:flex-row @xl/row:items-center @xl/row:gap-3">
				{/* Line 1: grip + Edit body */}
				<div className="flex min-w-0 flex-1 items-center gap-3">
					{reorderHandle}
					<button
						type="button"
						onClick={onEdit}
						disabled={pending}
						aria-label={`Edit ${art.title}`}
						className="flex min-h-control min-w-0 flex-1 items-center gap-3 rounded-(--radius-sm) text-left transition-ui pressable hover:text-accent-text disabled:pointer-events-none disabled:opacity-50"
					>
						<span className="relative shrink-0">
							{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
							<img src={thumb} alt="" className={cn(adminThumb, "size-14 @xl/row:size-16")} />
							<span
								aria-hidden="true"
								className="absolute top-1 left-1 rounded-full bg-scrim/80 px-1.5 py-0.5 text-micro leading-none tabular-nums text-bg dark:text-ink"
							>
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
				</div>

				{/* Line 2 (phone) / trailing cluster (one-line rows) */}
				<div className="flex items-center gap-2 @xl/row:shrink-0">
					<StatusChip
						title={art.title}
						status={art.status ?? "archive"}
						priceInr={art.priceInr}
						disabled={pending}
						onChange={onSetStatus}
					/>
					<FeaturedToggle
						title={art.title}
						featured={art.featured}
						disabled={pending}
						onChange={onSetFeatured}
					/>
					<div className="ml-auto flex items-center border-l border-line pl-4 @xl/row:ml-4">
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
			</div>
			{error ? (
				<AdminNotice variant="error" className="mt-3">
					{error}
				</AdminNotice>
			) : null}
		</li>
	);
}

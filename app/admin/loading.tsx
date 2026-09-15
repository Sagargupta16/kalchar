import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "./_components/admin-page";
import { adminPanel } from "./_components/controls";

const TILES = Array.from({ length: 12 }, (_, i) => i);
const CHIPS = [0, 1, 2, 3, 4];

/**
 * Pieces loading state uses the page's responsive columns, gaps and rounded cards.
 */
export default function AdminLoading() {
	return (
		<AdminPageSkeleton>
			<div className={adminPanel}>
				<Skeleton className="h-control w-full rounded-(--radius-sm)" />
				<div className="mt-(--space-tight) flex gap-2 overflow-hidden">
					{CHIPS.map((chip) => (
						<Skeleton key={chip} className="h-control w-24 shrink-0 rounded-full" />
					))}
				</div>
				<div className="mt-(--space-tight) flex items-center justify-between gap-3">
					<Skeleton className="h-4 w-20" />
					<div className="flex gap-2">
						<Skeleton className="size-control rounded-(--radius-sm)" />
						<Skeleton className="size-control rounded-(--radius-sm)" />
					</div>
				</div>
				<div className="mt-(--space-group) grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
					{TILES.map((tile) => (
						<Skeleton key={tile} className="aspect-4/5 rounded-md" />
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

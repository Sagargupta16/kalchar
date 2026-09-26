import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminPageSkeleton } from "./_components/admin-page";
import { AdminTabsSkeleton } from "./_components/admin-skeletons";

const TILES = Array.from({ length: 12 }, (_, i) => i);
/** Phone spans of the five stat tiles (6-column grid; one row of five from lg). */
const STATS = [
	{ slot: 0, span: "col-span-3" },
	{ slot: 1, span: "col-span-3" },
	{ slot: 2, span: "col-span-2" },
	{ slot: 3, span: "col-span-2" },
	{ slot: 4, span: "col-span-2" },
];

/**
 * Pieces loading state on the page's own frames: the stats strip, search,
 * the segmented lens track beside the view toggle, then square tile cards in
 * the responsive columns and gaps.
 */
export default function AdminLoading() {
	return (
		<AdminPageSkeleton>
			<div className="grid grid-cols-6 gap-2 sm:gap-3 lg:grid-cols-5 lg:gap-4">
				{STATS.map(({ slot, span }) => (
					<div
						key={slot}
						className={cn(
							"flex h-24 flex-col justify-between rounded-(--radius-md) border border-line bg-surface p-3 shadow-e1 sm:h-28 sm:p-4 lg:col-span-1",
							span,
						)}
					>
						<Skeleton className="h-3 w-20 max-w-full" />
						<Skeleton className="h-7 w-10" />
					</div>
				))}
			</div>
			<div className="grid gap-3">
				<Skeleton className="h-control w-full" />
				<div className="flex items-center gap-2 overflow-hidden">
					<div className="min-w-0 flex-1 overflow-hidden">
						<AdminTabsSkeleton count={5} />
					</div>
					<Skeleton className="h-13 w-24 shrink-0 rounded-(--radius-md)" />
				</div>
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
				{TILES.map((tile) => (
					<div
						key={tile}
						className="overflow-hidden rounded-(--radius-md) border border-line bg-surface shadow-e1"
					>
						<Skeleton className="aspect-square w-full rounded-none" />
						<div className="space-y-2 p-(--card-pad-compact)">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
							<Skeleton className="mt-3 h-6 w-20 rounded-full" />
						</div>
					</div>
				))}
			</div>
		</AdminPageSkeleton>
	);
}

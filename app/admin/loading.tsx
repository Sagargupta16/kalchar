import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminPageSkeleton } from "./_components/admin-page";
import { adminPanel } from "./_components/controls";

const STAT_TILES = [0, 1, 2, 3];
const ROWS = [0, 1, 2, 3, 4, 5];
const CHIPS = [0, 1, 2, 3, 4];

/**
 * Dashboard skeleton: the resolved page's twin. Four stat tiles, then the Add
 * panel beside the Pieces panel from lg (search field, chip row, list rows at
 * the row heights: two lines on phones, one line from sm).
 */
export default function AdminLoading() {
	return (
		<AdminPageSkeleton>
			<div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-4">
				{STAT_TILES.map((tile) => (
					<div key={tile} className={cn(adminPanel, "p-4")}>
						<Skeleton className="h-5 w-24" />
						<Skeleton className="mt-2 h-8 w-10" />
					</div>
				))}
			</div>
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<div className={adminPanel}>
					<Skeleton className="h-5 w-32" />
					<Skeleton className="mt-2 h-4 w-full max-w-md" />
					<Skeleton className="mt-6 h-control w-full rounded-(--radius-sm)" />
					<Skeleton className="mt-4 h-control w-full rounded-(--radius-sm)" />
					<Skeleton className="mt-4 h-control w-full rounded-(--radius-sm)" />
				</div>
				<div className={adminPanel}>
					<Skeleton className="h-5 w-20" />
					<Skeleton className="mt-2 h-4 w-full max-w-lg" />
					<Skeleton className="mt-6 h-control w-full rounded-(--radius-sm)" />
					<div className="mt-3 flex gap-2 overflow-hidden">
						{CHIPS.map((chip) => (
							<Skeleton key={chip} className="h-control w-24 shrink-0 rounded-full" />
						))}
					</div>
					<div className="mt-4 space-y-tight">
						{ROWS.map((row) => (
							<Skeleton key={row} className="h-[8.75rem] rounded-(--radius-sm) sm:h-22" />
						))}
					</div>
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

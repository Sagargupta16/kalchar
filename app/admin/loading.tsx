import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "./_components/admin-page";
import { adminPanel } from "./_components/controls";

const TILES = Array.from({ length: 12 }, (_, i) => i);
const CHIPS = [0, 1, 2, 3, 4];

/**
 * Dashboard skeleton: the resolved page's twin (1.14). One panel holding the
 * search field, the chip rail, the count line, then the 3-col (6 at xl)
 * square tile grid with the tight seams, so the resolve does not jump between
 * shapes. Grid view is the default (D-A13).
 */
export default function AdminLoading() {
	return (
		<AdminPageSkeleton>
			<div className={adminPanel}>
				<Skeleton className="h-control w-full rounded-(--radius-sm)" />
				<div className="mt-3 flex gap-2 overflow-hidden">
					{CHIPS.map((chip) => (
						<Skeleton key={chip} className="h-control w-24 shrink-0 rounded-full" />
					))}
				</div>
				<div className="mt-3 flex items-center justify-between gap-3">
					<Skeleton className="h-4 w-20" />
					<div className="flex gap-2">
						<Skeleton className="size-control rounded-(--radius-sm)" />
						<Skeleton className="size-control rounded-(--radius-sm)" />
					</div>
				</div>
				<div className="mt-4 grid grid-cols-3 gap-(--grid-gap-tight) xl:grid-cols-6">
					{TILES.map((tile) => (
						<Skeleton key={tile} className="aspect-square rounded-none" />
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

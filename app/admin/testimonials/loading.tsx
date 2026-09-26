import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { AdminListHeaderSkeleton } from "../_components/admin-skeletons";
import { adminRow } from "../_components/controls";

const ROWS = [0, 1, 2];

/** Full-width list with Add in its header; quote rows are taller than the default row. */
export default function AdminTestimonialsLoading() {
	return (
		<AdminPageSkeleton>
			<section>
				<AdminListHeaderSkeleton />
				<div className="space-y-tight">
					{ROWS.map((row) => (
						<div key={row} className={adminRow}>
							<Skeleton className="h-4 w-11/12" />
							<Skeleton className="mt-2 h-4 w-2/3" />
							<div className="mt-4 flex items-center justify-between gap-3">
								<Skeleton className="h-3 w-40" />
								<Skeleton className="size-control" />
							</div>
						</div>
					))}
				</div>
			</section>
		</AdminPageSkeleton>
	);
}

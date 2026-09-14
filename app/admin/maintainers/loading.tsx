import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminMaintainersLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: add form beside the roster from lg (Tier 2g:
			    invite 4, roster 8); each roster row leads with an initials disc. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
				<Skeleton className="h-64 w-full rounded-(--radius-md) sm:h-44" />
				<div className="divide-y divide-line overflow-hidden rounded-(--radius-md) border border-line">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex items-center gap-3 px-4 py-3">
							<Skeleton className="size-11 shrink-0 rounded-full" />
							<div className="min-w-0 flex-1 space-y-2">
								<Skeleton className="h-4 w-40 max-w-full" />
								<Skeleton className="h-3 w-56 max-w-full" />
							</div>
						</div>
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

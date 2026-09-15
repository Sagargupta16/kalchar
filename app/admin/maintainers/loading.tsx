import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { adminPanelInset } from "../_components/controls";

export default function AdminMaintainersLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: add form beside the roster from lg (Tier 2g:
			    invite 4, roster 8); each roster row leads with an initials disc. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
				<div className={adminPanelInset}>
					<div className="mb-(--form-gap) grid gap-2">
						<Skeleton className="h-5 w-40 max-w-full" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-3/4" />
					</div>
					<div className="grid gap-(--form-gap)">
						{[0, 1].map((i) => (
							<div key={i} className="grid gap-(--field-label-gap)">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-control w-full" />
							</div>
						))}
						<Skeleton className="h-control w-full sm:w-40 sm:justify-self-end" />
					</div>
				</div>
				<div className="min-w-0">
					<div className="mb-(--form-gap) grid gap-2">
						<Skeleton className="h-5 w-40 max-w-full" />
						<Skeleton className="h-3 w-72 max-w-full" />
					</div>
					<div className="divide-y divide-line overflow-hidden rounded-(--radius-md) border border-line">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
							>
								<Skeleton className="size-control shrink-0 rounded-full" />
								<div className="min-w-0 space-y-2">
									<Skeleton className="h-4 w-40 max-w-full" />
									<Skeleton className="h-3 w-56 max-w-full" />
								</div>
								<Skeleton className="col-start-2 h-control w-24 sm:col-auto" />
							</div>
						))}
					</div>
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { adminRow } from "../_components/controls";

export default function AdminEventsLoading() {
	return (
		<AdminPageSkeleton>
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<Skeleton className="h-control w-full rounded-(--radius-sm) sm:w-40" />
				<div className="min-w-0 space-y-tight">
					<div className="mb-(--space-group) space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-full max-w-72" />
					</div>
					{[0, 1, 2].map((slot) => (
						<div key={slot} className={adminRow}>
							<div className="@container/row">
								<div className="flex flex-col gap-4 @xl/row:flex-row @xl/row:items-center @xl/row:gap-3">
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<Skeleton className="size-14 shrink-0" />
										<div className="min-w-0 flex-1 space-y-2">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
									<div className="flex items-center justify-between gap-4">
										<Skeleton className="size-control" />
										<Skeleton className="size-control" />
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { adminPanel } from "../_components/controls";

export default function AdminProfileLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: photo panel (centred round portrait, Tier 2f)
			    beside the intro toggle from lg (ruling 42). */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
				<div className={adminPanel}>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="mt-2 h-8 w-full" />
					<div className="mt-4 flex flex-col items-center gap-3">
						<Skeleton className="size-32 rounded-full" />
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-44 max-w-full" />
					</div>
				</div>
				<div className={adminPanel}>
					<div className="flex items-start justify-between gap-3">
						<Skeleton className="h-4 w-40 max-w-full" />
						<Skeleton className="h-6 w-11 shrink-0 rounded-full" />
					</div>
					<Skeleton className="mt-2 h-8 w-full" />
					<Skeleton className="mt-(--form-gap) h-4 w-28 max-w-full" />
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

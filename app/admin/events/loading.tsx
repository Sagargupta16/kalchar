import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminEventsLoading() {
	return (
		<AdminPageSkeleton>
			<div className="space-y-group">
				<Skeleton className="h-control w-full rounded-(--radius-sm) sm:w-40" />
				<SkeletonRows count={3} />
			</div>
		</AdminPageSkeleton>
	);
}

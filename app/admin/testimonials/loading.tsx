import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminTestimonialsLoading() {
	return (
		<AdminPageSkeleton>
			<div className="space-y-group">
				<Skeleton className="h-control w-full rounded-(--radius-sm) sm:w-40" />
				{/* Quote rows are taller than the h-16 default; the role="status" live region comes from AdminPageSkeleton. */}
				<div className="space-y-tight">
					<Skeleton className="h-28 rounded-(--radius-sm)" />
					<Skeleton className="h-28 rounded-(--radius-sm)" />
					<Skeleton className="h-28 rounded-(--radius-sm)" />
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

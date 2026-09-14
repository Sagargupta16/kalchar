import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminLeadsLoading() {
	return (
		<AdminPageSkeleton>
			{/* Chip row, then card-height rows; the role="status" live region comes
			    from AdminPageSkeleton. */}
			<div className="space-y-group">
				<div className="flex gap-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-control w-20 rounded-full" />
					))}
				</div>
				<div className="space-y-tight">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-40 w-full" />
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

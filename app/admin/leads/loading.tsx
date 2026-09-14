import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminLeadsLoading() {
	return (
		<AdminPageSkeleton>
			{/* Chip rail, then inbox-row bars and the lg reading pane; the
			    role="status" live region comes from AdminPageSkeleton. */}
			<div className="space-y-group">
				<div className="flex gap-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-control w-20 rounded-full" />
					))}
				</div>
				<div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-page">
					<div className="space-y-tight lg:col-span-5">
						{[0, 1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
					<Skeleton className="hidden h-72 lg:col-span-7 lg:block" />
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { AdminRowsSkeleton, AdminTabsSkeleton } from "../_components/admin-skeletons";

/** Lens track, then inbox rows beside the lg reading pane; the live region comes from AdminPageSkeleton. */
export default function AdminLeadsLoading() {
	return (
		<AdminPageSkeleton>
			<div className="space-y-group">
				<AdminTabsSkeleton count={4} />
				<div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-(--space-page)">
					<AdminRowsSkeleton
						count={5}
						thumb="size-control rounded-full"
						controls={0}
						className="lg:col-span-5"
					/>
					<Skeleton className="hidden h-72 rounded-(--radius-md) lg:col-span-7 lg:block" />
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

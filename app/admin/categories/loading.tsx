import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { adminPanelInset } from "../_components/controls";

export default function AdminCategoriesLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: add form beside the list from lg (ruling 42); the
			    add field is the chip-shaped pill (Tier 2e). The role="status" live
			    region comes from AdminPageSkeleton. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<div className={adminPanelInset}>
					<Skeleton className="h-4 w-32" />
					<Skeleton className="mt-4 h-control w-full rounded-full" />
				</div>
				<div className="space-y-tight">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

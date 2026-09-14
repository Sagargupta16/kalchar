import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminMaintainersLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: add form beside the roster from lg (ruling 42). */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<Skeleton className="h-64 w-full rounded-(--radius-md) sm:h-44" />
				<div className="divide-y divide-line overflow-hidden rounded-(--radius-md) border border-line">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-16 w-full rounded-none" />
					))}
				</div>
			</div>
		</AdminPageSkeleton>
	);
}

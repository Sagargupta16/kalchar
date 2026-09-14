import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";
import { adminPanel } from "../_components/controls";

export default function AdminPresetsLoading() {
	return (
		<AdminPageSkeleton>
			{/* One panel per preset group: title, rows, add form. The role="status"
			    live region comes from AdminPageSkeleton. */}
			<div className="space-y-group">
				{[0, 1, 2].map((g) => (
					<div key={g} className={adminPanel}>
						<Skeleton className="h-4 w-20" />
						<div className="mt-4 space-y-tight">
							{[0, 1, 2].map((i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
						<Skeleton className="mt-4 h-control w-full" />
					</div>
				))}
			</div>
		</AdminPageSkeleton>
	);
}

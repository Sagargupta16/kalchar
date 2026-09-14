import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageSkeleton } from "../_components/admin-page";

export default function AdminProfileLoading() {
	return (
		<AdminPageSkeleton>
			{/* Mirrors the page: photo panel beside the intro toggle from lg (ruling 42). */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
				<Skeleton className="h-52 w-full rounded-(--radius-md)" />
				<Skeleton className="h-24 w-full rounded-(--radius-md)" />
			</div>
		</AdminPageSkeleton>
	);
}

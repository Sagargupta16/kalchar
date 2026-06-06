import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMaintainersLoading() {
	return (
		<div className="max-w-2xl space-y-6">
			<Skeleton className="h-4 w-28" />
			<Skeleton className="h-28 w-full rounded-(--radius-md)" />
			<div className="space-y-px rounded-(--radius-md) border border-line">
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className="h-16 w-full" />
				))}
			</div>
		</div>
	);
}

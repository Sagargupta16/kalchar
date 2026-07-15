import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEventsLoading() {
	return (
		<div className="max-w-3xl space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-7 w-24" />
				<Skeleton className="h-4 w-80 max-w-full" />
			</div>
			<Skeleton className="h-48 w-full rounded-(--radius-md)" />
			<div className="space-y-3">
				{[0, 1, 2].map((i) => (
					<Skeleton key={i} className="h-16 w-full rounded-(--radius-md)" />
				))}
			</div>
		</div>
	);
}

import { Skeleton } from "@/components/ui/skeleton";

export default function AdminWorkshopsLoading() {
	return (
		<div className="max-w-3xl space-y-6">
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-32 w-full rounded-(--radius-md)" />
			<div className="space-y-2">
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-16 w-full rounded-(--radius-sm)" />
				))}
			</div>
		</div>
	);
}

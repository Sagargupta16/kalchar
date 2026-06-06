import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPresetsLoading() {
	return (
		<div className="max-w-2xl space-y-8">
			<Skeleton className="h-4 w-40" />
			{[0, 1, 2].map((g) => (
				<div key={g} className="rounded-(--radius-md) border border-line bg-bg p-4 sm:p-5">
					<Skeleton className="h-4 w-20" />
					<div className="mt-3 space-y-2">
						{[0, 1, 2].map((i) => (
							<Skeleton key={i} className="h-11 w-full rounded-(--radius-sm)" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

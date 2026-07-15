import { Skeleton } from "@/components/ui/skeleton";

/** Admin dashboard skeleton: stat cards, upload panel, list rows. */
export default function AdminLoading() {
	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<Skeleton className="h-7 w-28" />
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>
			{/* Stat cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="rounded-(--radius-md) border border-line bg-bg p-4">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="mt-3 h-7 w-10" />
					</div>
				))}
			</div>
			{/* A panel */}
			<div className="rounded-(--radius-md) border border-line bg-bg p-5 sm:p-6">
				<Skeleton className="h-4 w-32" />
				<div className="mt-4 space-y-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-12 w-full rounded-(--radius-sm)" />
					))}
				</div>
			</div>
		</div>
	);
}

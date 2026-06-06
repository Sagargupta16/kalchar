import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function CustomOrdersLoading() {
	return (
		<main>
			<Container className="py-(--section-py)">
				<SkeletonHeader />
				<div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-14">
					{/* How it works */}
					<aside className="space-y-6 md:col-span-5">
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-1/2" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						))}
					</aside>
					{/* Form */}
					<div className="md:col-span-7">
						<div className="space-y-4 rounded-(--radius-md) border border-line bg-bg-soft p-6 sm:p-8">
							{[0, 1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-11 w-full" />
							))}
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-12 w-40" />
						</div>
					</div>
				</div>
			</Container>
		</main>
	);
}

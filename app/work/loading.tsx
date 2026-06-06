import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

export default function WorkLoading() {
	return (
		<main>
			<section className="border-b border-line bg-bg-soft">
				<Container className="py-(--section-py)">
					<SkeletonHeader />
					<Skeleton className="mt-6 h-3 w-16" />
				</Container>
			</section>
			<section>
				<Container className="py-(--section-py)">
					{/* Filter pills */}
					<div className="flex flex-wrap gap-2">
						{[0, 1, 2, 3, 4, 5, 6].map((i) => (
							<Skeleton key={i} className="h-10 w-20 rounded-full" />
						))}
					</div>
					{/* Grid */}
					<ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
						{[0, 1, 2, 3, 4, 5].map((i) => (
							<li key={i}>
								<SkeletonCard />
							</li>
						))}
					</ul>
				</Container>
			</section>
		</main>
	);
}

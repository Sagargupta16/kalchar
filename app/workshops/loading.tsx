import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function WorkshopsLoading() {
	return (
		<main>
			<Container className="py-(--section-py)">
				<SkeletonHeader />
				<ul className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2, 3, 4].map((i) => (
						<li key={i} className="space-y-3 rounded-(--radius-md) border border-line bg-bg p-5">
							<Skeleton className="h-6 w-2/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-7 w-28 rounded-full" />
						</li>
					))}
				</ul>
			</Container>
		</main>
	);
}

import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Home page skeleton: hero (text + plate) then a 3-card rail. */
export default function HomeLoading() {
	return (
		<main>
			<section className="border-b border-line">
				<Container className="py-(--section-py)">
					<div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-12">
						<div className="space-y-5 md:col-span-7">
							<Skeleton className="h-3 w-40" />
							<Skeleton className="h-16 w-3/4" />
							<Skeleton className="h-4 w-full max-w-xl" />
							<Skeleton className="h-4 w-2/3" />
							<div className="flex gap-2 pt-2">
								<Skeleton className="h-7 w-20 rounded-full" />
								<Skeleton className="h-7 w-20 rounded-full" />
								<Skeleton className="h-7 w-20 rounded-full" />
							</div>
							<div className="flex gap-3 pt-2">
								<Skeleton className="h-11 w-36" />
								<Skeleton className="h-11 w-44" />
							</div>
						</div>
						<div className="md:col-span-5">
							<Skeleton className="aspect-3/4 w-full rounded-(--radius-lg)" />
						</div>
					</div>
				</Container>
			</section>

			<div className="border-b border-line py-(--section-py)">
				<Container>
					<Skeleton className="h-9 w-72" />
					<ul className="mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 sm:mt-14">
						{[0, 1, 2].map((i) => (
							<li key={i}>
								<SkeletonCard />
							</li>
						))}
					</ul>
				</Container>
			</div>
		</main>
	);
}

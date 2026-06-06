import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function AboutLoading() {
	return (
		<main>
			<Container className="py-(--section-py)">
				<SkeletonHeader />
				<div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-14">
					<div className="space-y-4 md:col-span-8">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
					<aside className="space-y-4 md:col-span-4">
						<Skeleton className="h-28 w-full rounded-(--radius-md)" />
						<Skeleton className="h-28 w-full rounded-(--radius-md)" />
					</aside>
				</div>
			</Container>
		</main>
	);
}

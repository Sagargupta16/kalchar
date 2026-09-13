import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function WorkshopsLoading() {
	return (
		<main>
			<Section padded>
				<SkeletonHeader />
				<ul className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-2 lg:grid-cols-3">
					{[0, 1, 2, 3, 4].map((i) => (
						<li
							key={i}
							className="flex flex-col gap-3 rounded-(--radius-md) border border-line bg-surface p-(--card-pad) shadow-e1"
						>
							<Skeleton className="h-6 w-2/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="mt-3 h-11 w-full sm:w-28" />
						</li>
					))}
				</ul>
			</Section>
		</main>
	);
}

import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton twin of /events: header, then two event panels with a six-tile grid. */
export default function EventsLoading() {
	return (
		<main>
			<Section padded>
				<SkeletonHeader />
				<div className="mt-(--space-block) flex flex-col gap-(--grid-gap)">
					{[0, 1].map((i) => (
						<div
							key={i}
							className="rounded-(--radius-md) border border-line bg-surface p-(--card-pad) shadow-e1"
						>
							<Skeleton className="h-3 w-40" />
							<Skeleton className="mt-3 h-7 w-2/3" />
							<Skeleton className="mt-3 h-4 w-full max-w-(--header-max)" />
							<div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
								{[0, 1, 2, 3, 4, 5].map((tile) => (
									<Skeleton key={tile} className="aspect-square rounded-(--radius-md)" />
								))}
							</div>
						</div>
					))}
				</div>
			</Section>
		</main>
	);
}

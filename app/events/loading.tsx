import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton twin of /events: wash header, then two borderless exhibition
 *  records (wall date column beside the record from lg) with photo tiles. */
export default function EventsLoading() {
	return (
		<main>
			<output className="sr-only">Loading events...</output>
			<Section accent="peacock" background="wash" padded containerClassName="py-(--space-block)">
				<SkeletonHeader />
				<Skeleton className="mt-5 h-11 w-full sm:w-48" />
			</Section>
			<Section accent="peacock" padded containerClassName="pt-(--space-block)">
				<div>
					{[0, 1].map((i) => (
						<div
							key={i}
							className="grid gap-4 border-t border-line py-(--space-block) first:border-t-0 first:pt-0 lg:grid-cols-[10rem_1fr] lg:gap-10"
						>
							<div className="flex items-baseline gap-3 lg:flex-col lg:gap-2">
								<Skeleton className="h-8 w-10" />
								<Skeleton className="h-3 w-16" />
							</div>
							<div>
								<Skeleton className="h-3 w-24" />
								<Skeleton className="mt-3 h-7 w-2/3" />
								<Skeleton className="mt-3 h-4 w-full max-w-(--measure-essay)" />
								<Skeleton className="mt-6 h-5 w-64 max-w-full" />
								<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
									{[0, 1, 2, 3, 4, 5].map((tile) => (
										<Skeleton key={tile} className="aspect-square rounded-(--radius-md)" />
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</Section>
		</main>
	);
}

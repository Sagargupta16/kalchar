import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural twin of the detail page: back link, plate (7 of 12), info column
 *  in the 2.3 order (gold bar, wall label, price, full-width CTA, prose). */
export default function ArtworkDetailLoading() {
	return (
		<Container as="main" className="py-(--section-py)">
			<div role="status" aria-busy="true">
				<span className="sr-only">Loading</span>
				<Skeleton className="h-control w-28" />
				<div className="mt-(--space-block) grid gap-(--space-block) md:grid-cols-12 md:gap-12">
					{/* A skeleton has no data, so the schema-default 3:4 stands in for the piece's own ratio. */}
					<Skeleton className="aspect-3/4 w-full rounded-none md:col-span-7 md:rounded-(--radius-lg)" />
					<div className="md:col-span-5">
						{/* Gold label bar + wall label lines */}
						<Skeleton className="h-0.5 w-8" />
						<Skeleton className="mt-4 h-3 w-24" />
						<Skeleton className="mt-2 h-8 w-3/4" />
						<Skeleton className="mt-2 h-3 w-2/3" />
						{/* Price numeral */}
						<Skeleton className="mt-2 h-8 w-32" />
						{/* CTA panel with the full-width primary */}
						<div className="mt-(--space-block) rounded-(--radius-md) border-t-2 border-line bg-canvas p-(--card-pad)">
							<Skeleton className="h-12 w-full rounded-(--radius-sm)" />
							<Skeleton className="mt-3 h-3 w-2/3" />
						</div>
						{/* Description + facts */}
						<Skeleton className="mt-(--space-block) h-4 w-full" />
						<Skeleton className="mt-2 h-4 w-5/6" />
						<div className="mt-8 space-y-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
				</div>
			</div>
		</Container>
	);
}

import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural twin of the detail page: back link, plate (7 of 12), info column
 *  in the 2.3 order (wall label, price, full-width CTA, prose). */
export default function ArtworkDetailLoading() {
	return (
		<Container as="main" className="py-(--section-py)">
			<div aria-busy="true">
				<output className="sr-only">Loading</output>
				<Skeleton className="h-control w-28" />
				<div className="mt-(--space-block) grid gap-(--space-block) md:grid-cols-12 md:gap-12">
					<div className="min-w-0 md:col-span-7">
						<div className="md:top-[calc(var(--header-h-shrunk)+var(--space-page))] [@media(min-width:48rem)_and_(min-height:43.8125rem)]:sticky">
							<div className="-mx-(--container-px) md:mx-0">
								{/* Use a portrait placeholder until the artwork's own ratio is known. */}
								<Skeleton className="mx-auto aspect-(--plate-ratio) w-[min(100%,calc(72dvh*var(--plate-ratio)))] rounded-(--radius-lg) shadow-e2-edged [--plate-ratio:0.8] md:w-[min(100%,calc((100dvh-var(--header-h-shrunk)-4rem)*var(--plate-ratio)))]" />
							</div>
						</div>
					</div>
					<div className="min-w-0 md:col-span-5">
						{/* Wall label lines */}
						<Skeleton className="mt-4 h-3 w-24" />
						<Skeleton className="mt-2 h-8 w-3/4" />
						<Skeleton className="mt-2 h-3 w-2/3" />
						{/* Price numeral */}
						<Skeleton className="mt-2 h-8 w-32" />
						{/* CTA panel with the full-width primary */}
						<div className="mt-(--space-block) rounded-(--radius-md) border border-line bg-canvas p-(--card-pad) shadow-e1">
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

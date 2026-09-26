import { MastheadSkeleton } from "@/components/editorial/masthead-skeleton";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton twin of /events: the peacock masthead, then two timeline records
 *  (date column beside the record from lg) with their photo mosaics. */
export default function EventsLoading() {
	return (
		<main>
			<output className="sr-only">Loading events...</output>
			<MastheadSkeleton accent="peacock" />
			<Section accent="peacock" padded containerClassName="pt-(--space-canyon)">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="grid gap-4 pb-(--space-canyon) pl-9 lg:grid-cols-[10rem_1fr] lg:gap-x-14 lg:pl-0"
					>
						<div className="flex items-baseline gap-3 lg:flex-col lg:gap-2">
							<Skeleton className="h-10 w-12" />
							<Skeleton className="h-3 w-20" />
						</div>
						<div>
							<Skeleton className="h-6 w-24 rounded-full" />
							<Skeleton className="mt-3 h-8 w-2/3" />
							<Skeleton className="mt-3 h-4 w-full max-w-(--measure-essay)" />
							<div className="mt-6 columns-2 gap-2 sm:columns-3 sm:gap-3">
								{["aspect-4/3", "aspect-3/4", "aspect-4/3", "aspect-square", "aspect-4/3"].map(
									(aspect, tile) => (
										<Skeleton
											// biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder slots
											key={tile}
											className={`mb-2 break-inside-avoid rounded-(--radius-md) sm:mb-3 ${aspect}`}
										/>
									),
								)}
							</div>
						</div>
					</div>
				))}
			</Section>
		</main>
	);
}

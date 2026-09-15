import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

/**
 * Mirrors app/page.tsx after the visual pass (visual-direction 2.1): hero on
 * the grand rhythm in the Head / Plate / Body phone order with copy in the
 * md:col-span-5 column and the plate in the majority md:col-span-7 column
 * (up to 560px wide), wall-label bars under the plate, then Selected work as
 * six 3:4 plates on the shared GalleryGrid.
 */
const SELECTED_WORK_COUNT = 6;

export default function HomeLoading() {
	return (
		<main>
			<Section padded rhythm="grand">
				<div className="grid gap-8 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-12 md:gap-y-6">
					{/* Head: eyebrow + h1 */}
					<div className="md:col-span-5 md:row-start-1 md:self-end">
						<Skeleton className="h-3 w-40" />
						<Skeleton className="mt-4 h-24 w-3/4 sm:h-28" />
					</div>
					{/* Plate: directly under the headline on phones, majority column on md+;
					    wall-label bars mirror the WallLabel counter / title / meta lines. */}
					<div className="mx-auto w-full max-w-xs sm:max-w-sm md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 md:max-w-[35rem] md:self-center">
						<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
						<div className="mt-4 grid gap-2">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
					{/* Body: lead + chips + CTAs */}
					<div className="md:col-span-5 md:col-start-1 md:row-start-2 md:self-start">
						<Skeleton className="h-4 w-full max-w-xl" />
						<Skeleton className="mt-2 h-4 w-2/3" />
						<div className="mt-6 flex flex-wrap gap-2">
							<Skeleton className="h-9 w-24 rounded-full" />
							<Skeleton className="h-9 w-24 rounded-full" />
							<Skeleton className="h-9 w-24 rounded-full" />
						</div>
						<div className="mt-8 flex flex-wrap gap-3">
							<Skeleton className="h-11 w-36" />
							<Skeleton className="h-11 w-44" />
						</div>
					</div>
				</div>
			</Section>

			<Section padded rhythm="grand">
				<SkeletonHeader />
				<GalleryGrid className="mt-(--space-block)">
					{Array.from({ length: SELECTED_WORK_COUNT }, (_, i) => i).map((slot) => (
						<li key={slot}>
							<SkeletonCard />
						</li>
					))}
				</GalleryGrid>
			</Section>
		</main>
	);
}

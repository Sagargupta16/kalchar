import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

/**
 * Mirrors app/page.tsx: hero in the final Head / Plate / Body phone order
 * (the plate sits inside the first phone screen; headline-left, plate-right
 * from md via the same explicit row placement as components/home/hero.tsx),
 * then Selected work as six 3:4 plates on the shared GalleryGrid.
 */
const SELECTED_WORK_COUNT = 6;

export default function HomeLoading() {
	return (
		<main>
			<Section padded borderBottom>
				<div className="grid gap-8 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-12 md:gap-y-6">
					{/* Head: eyebrow + h1 */}
					<div className="md:col-span-7 md:row-start-1 md:self-end">
						<Skeleton className="h-3 w-40" />
						<Skeleton className="mt-4 h-24 w-3/4 sm:h-28" />
					</div>
					{/* Plate: directly under the headline on phones, right column on md+ */}
					<div className="mx-auto w-full max-w-xs sm:max-w-sm md:col-span-5 md:col-start-8 md:row-span-2 md:row-start-1 md:max-w-none md:self-center">
						<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
					</div>
					{/* Body: lead + chips + CTAs */}
					<div className="md:col-span-7 md:col-start-1 md:row-start-2 md:self-start">
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

			<Section padded borderBottom>
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

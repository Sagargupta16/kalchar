import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/ui/skeleton";

/** Structural twin of app/work/page.tsx + WorkFilter so the swap shifts nothing. */
export default function WorkLoading() {
	return (
		<main role="status" aria-busy="true">
			<span className="sr-only">Loading</span>
			<Section background="canvas" borderBottom padded>
				<SkeletonHeader />
				<Skeleton className="mt-6 h-3 w-16" />
			</Section>
			<Section padded containerClassName="pt-(--space-block)">
				{/* Filter pill rail */}
				<div className="flex gap-2 overflow-hidden">
					{[0, 1, 2, 3, 4, 5, 6].map((i) => (
						<Skeleton key={i} className="h-control w-20 shrink-0 rounded-full" />
					))}
				</div>
				{/* Visible result count */}
				<Skeleton className="mt-4 h-3 w-40" />
				<GalleryGrid className="mt-(--space-block)">
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<li key={i}>
							<SkeletonCard />
						</li>
					))}
				</GalleryGrid>
			</Section>
		</main>
	);
}

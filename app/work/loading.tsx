import { GallerySkeleton } from "@/components/gallery/gallery-grid";
import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Structural twin of app/work/page.tsx + WorkFilter so the swap shifts nothing. */
export default function WorkLoading() {
	return (
		<main aria-busy="true">
			<Section
				accent="accent"
				background="wash"
				padded
				containerClassName="grid gap-4 py-(--space-page) lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
			>
				<SkeletonHeader />
				<div className="lg:w-64">
					<Skeleton className="h-5 w-48" />
				</div>
			</Section>
			<Section accent="accent" padded containerClassName="pt-6">
				<GallerySkeleton />
			</Section>
		</main>
	);
}

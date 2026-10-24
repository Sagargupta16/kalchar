import { MastheadSkeleton } from "@/components/editorial/masthead-skeleton";
import { GallerySkeleton } from "@/components/gallery/gallery-grid";
import { Section } from "@/components/ui/section";

/** Structural twin of app/work/page.tsx + WorkFilter so the swap shifts little. */
export default function WorkLoading() {
	return (
		<main aria-busy="true">
			<MastheadSkeleton accent="accent" />
			<Section accent="accent" padded containerClassName="pt-8 sm:pt-10">
				<GallerySkeleton />
			</Section>
		</main>
	);
}

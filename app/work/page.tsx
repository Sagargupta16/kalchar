import { Suspense } from "react";
import { GallerySkeleton } from "@/components/gallery/gallery-grid";
import { WorkFilter } from "@/components/gallery/work-filter";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { isForSale } from "@/lib/catalog";
import { getAllArtworks, getCategoryNames, getSite } from "@/lib/data";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata({
	title: "Artwork",
	description:
		"Selected paintings across Madhubani, Pichwai, Lippan, Gond, Texture, and Mixed Media.",
	path: "/work/",
});

export default async function WorkPage() {
	const [all, styles] = await Promise.all([getAllArtworks(), getCategoryNames()]);
	const { sections } = getSite();
	const work = sections.work;
	const availableCount = all.filter(isForSale).length;

	return (
		<main>
			<Section
				accent="accent"
				background="wash"
				padded
				containerClassName="grid gap-4 py-(--space-page) lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
			>
				<PageHeader
					eyebrow={work?.eyebrow ?? "Work"}
					title={work?.pageTitle ?? work?.title ?? "Artwork"}
					lead={work?.pageLead ?? work?.lead}
				/>
				<Reveal eager className="grid gap-3 lg:max-w-64">
					<p className="text-sm text-muted">
						<span className="font-semibold tabular-nums text-ink">{all.length}</span>{" "}
						{all.length === 1 ? "original piece" : "original pieces"}
						{availableCount > 0 ? ` · ${availableCount} available to buy` : ""}
					</p>
				</Reveal>
			</Section>

			<Section accent="accent" padded containerClassName="pt-6">
				{/* Suspense boundary: WorkFilter reads useSearchParams (the ?style=
				    / ?view= lens), which Next requires be wrapped on a static route. */}
				<Suspense fallback={<GallerySkeleton />}>
					<WorkFilter styles={styles} items={all} />
				</Suspense>
			</Section>
		</main>
	);
}

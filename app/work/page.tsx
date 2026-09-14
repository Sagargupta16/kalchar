import { ArrowRight, BookOpen } from "lucide-react";
import { Suspense } from "react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { WorkFilter } from "@/components/gallery/work-filter";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { SkeletonCard } from "@/components/ui/skeleton";
import { getAllArtworks, getCategoryNames, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "Artwork",
	description:
		"Selected paintings across Madhubani, Pichwai, Lippan, Gond, Texture, and Mixed Media.",
	path: "/work/",
});

/** Suspense fallback only; the route skeleton is app/work/loading.tsx. */
const SKELETON_CARDS = [0, 1, 2, 3, 4, 5].map((i) => (
	<li key={i}>
		<SkeletonCard />
	</li>
));

export default async function WorkPage() {
	const [all, styles] = await Promise.all([getAllArtworks(), getCategoryNames()]);
	const { sections, contact } = getSite();
	const work = sections.work;

	return (
		<main>
			{/* The standard public page header (visual-direction 2.0): grand rhythm
			    on the flat ruby wash band; the count reads as wall text. */}
			<Section accent="ruby" background="wash" rhythm="grand" padded>
				<PageHeader
					eyebrow={work?.eyebrow ?? "Work"}
					title={work?.title ?? "Selected work"}
					lead={work?.lead}
				>
					<Reveal eager delayMs={staggerDelay(3)}>
						<p className="mt-6 flex items-baseline gap-2">
							<span className="t-numeral text-title text-accent-text">{all.length}</span>
							<span className="t-meta">{all.length === 1 ? "piece" : "pieces"}</span>
						</p>
					</Reveal>
					{contact.whatsapp.catalog ? (
						<Reveal eager delayMs={staggerDelay(4)}>
							<a
								href={contact.whatsapp.catalog}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(buttonVariants({ variant: "secondary" }), "group mt-6")}
							>
								<BookOpen size={16} aria-hidden="true" />
								Shop on WhatsApp
								<ArrowRight
									size={14}
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-1"
								/>
							</a>
						</Reveal>
					) : null}
				</PageHeader>
			</Section>

			<Section accent="ruby" padded containerClassName="pt-(--space-block)">
				{/* Suspense boundary: WorkFilter reads useSearchParams (the ?style=
				    / ?view= lens), which Next requires be wrapped on a static route. */}
				<Suspense
					fallback={<GalleryGrid className="mt-(--space-block)">{SKELETON_CARDS}</GalleryGrid>}
				>
					<WorkFilter styles={styles} items={all} />
				</Suspense>
			</Section>
		</main>
	);
}

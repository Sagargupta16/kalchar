import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Masthead } from "@/components/editorial/masthead";
import { GallerySkeleton } from "@/components/gallery/gallery-grid";
import { PlateFan } from "@/components/gallery/plate-fan";
import { WorkFilter } from "@/components/gallery/work-filter";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { isForSale } from "@/lib/catalog";
import { getAllArtworks, getCategoryNames, getSite } from "@/lib/data";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

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
	const traditions = new Set(all.map((piece) => piece.style)).size;

	return (
		<main>
			<Masthead
				accent="accent"
				glyph="कला"
				eyebrow={work?.eyebrow ?? "Work"}
				title={work?.pageTitle ?? work?.title ?? "Artwork"}
				lead={work?.pageLead ?? work?.lead}
				accentLast
				stats={[
					{ value: all.length, label: all.length === 1 ? "Original piece" : "Original pieces" },
					{ value: traditions, label: traditions === 1 ? "Tradition" : "Traditions" },
					{ value: availableCount, label: "Available now" },
				]}
				aside={<PlateFan artworks={all} />}
				actions={
					<>
						{availableCount > 0 ? (
							<Link
								href="/work/?view=available"
								className={buttonVariants({ variant: "primary", size: "lg" })}
							>
								<ShoppingBag size={18} aria-hidden="true" />
								Shop available pieces
							</Link>
						) : null}
						<Link
							href="/custom-orders/"
							className={cn(
								buttonVariants({ variant: "secondary", size: "lg" }),
								"group max-sm:hidden",
							)}
						>
							Commission a piece
							<ArrowRight
								size={16}
								aria-hidden="true"
								className="transition-transform group-hover:translate-x-1"
							/>
						</Link>
					</>
				}
			/>

			<Section accent="accent" padded containerClassName="pt-8 sm:pt-10">
				{/* Suspense boundary: WorkFilter reads useSearchParams (the ?style=
				    / ?view= lens), which Next requires be wrapped on a static route. */}
				<Suspense fallback={<GallerySkeleton />}>
					<WorkFilter styles={styles} items={all} />
				</Suspense>
			</Section>
		</main>
	);
}

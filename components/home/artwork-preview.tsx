import { ArtworkCard } from "@/components/gallery/artwork-card";
import { ArtworkWall } from "@/components/gallery/artwork-wall";
import { GALLERY_CARD_SIZES } from "@/components/gallery/gallery-grid";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { cardRevealDelay, staggerDelay } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArtworkPreviewProps {
	id: "work" | "available";
	artworks: readonly Artwork[];
	siblings: readonly Artwork[];
	eyebrow: string;
	title: string;
	lead?: string;
	href: string;
	actionLabel: string;
	catalogIndex: Record<string, number>;
	totalCount: number;
	maxColumns?: 3 | 4;
	priorityCount?: number;
}

function previewImageSizes(pieceCount: number, columns: number): string {
	if (pieceCount === 1) return "(min-width: 432px) 384px, calc(100vw - 48px)";
	if (columns === 2) return "(min-width: 816px) 372px, calc((100vw - 56px) / 2)";
	if (columns === 4) {
		return "(min-width: 1152px) 260px, (min-width: 1024px) 23vw, calc((100vw - 56px) / 2)";
	}
	return GALLERY_CARD_SIZES;
}

/** A lone piece sits beside its introduction; larger previews use only the columns they need. */
export function ArtworkPreview({
	id,
	artworks,
	siblings,
	eyebrow,
	title,
	lead,
	href,
	actionLabel,
	catalogIndex,
	totalCount,
	maxColumns = 3,
	priorityCount = 0,
}: Readonly<ArtworkPreviewProps>) {
	if (artworks.length === 0) return null;
	const single = artworks.length === 1;
	const columns = Math.min(artworks.length, maxColumns);
	const imageSizes = previewImageSizes(artworks.length, columns);
	const action = <SectionCta href={href}>{actionLabel}</SectionCta>;

	return (
		<Section id={id} padded rhythm="grand">
			<div className={cn(single && "grid items-center gap-8 md:grid-cols-2 md:gap-12")}>
				<div>
					<SectionHeader
						eyebrow={eyebrow}
						title={title}
						lead={lead}
						action={single ? undefined : action}
					/>
					{single ? (
						<Reveal delayMs={staggerDelay(2)}>
							<div className="mt-6">{action}</div>
						</Reveal>
					) : null}
				</div>
				{/* Every painting at its own ratio, edge to edge, on the same
				    shortest-column masonry as /work so short strips stay balanced. */}
				{single ? (
					<ul className="mx-auto w-full max-w-sm">
						<li>
							<ArtworkCard
								variant="wall"
								artwork={artworks[0] as Artwork}
								siblings={siblings}
								priority={priorityCount > 0}
								sizes={imageSizes}
								index={(catalogIndex[(artworks[0] as Artwork).slug] ?? 0) + 1}
								total={totalCount}
							/>
						</li>
					</ul>
				) : (
					<ArtworkWall
						artworks={artworks}
						siblings={siblings}
						sizes={imageSizes}
						priorityCount={priorityCount}
						catalogIndex={catalogIndex}
						totalCount={totalCount}
						maxColumns={columns}
						revealDelays={artworks.map((_, index) => cardRevealDelay(index, columns))}
						className={cn(columns === 2 && "mx-auto w-full max-w-3xl")}
					/>
				)}
			</div>
		</Section>
	);
}

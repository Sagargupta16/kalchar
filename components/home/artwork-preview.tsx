import { ArtworkCard } from "@/components/gallery/artwork-card";
import { GALLERY_CARD_SIZES } from "@/components/gallery/gallery-grid";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { gridStaggerDelay } from "@/lib/motion";
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
	const imageSizes = single
		? "(min-width: 432px) 384px, calc(100vw - 48px)"
		: columns === 2
			? "(min-width: 816px) 372px, calc((100vw - 56px) / 2)"
			: columns === 4
				? "(min-width: 1152px) 260px, (min-width: 1024px) 23vw, calc((100vw - 56px) / 2)"
				: GALLERY_CARD_SIZES;
	const action = <SectionCta href={href}>{actionLabel}</SectionCta>;

	return (
		<Section id={id} padded rhythm="grand">
			<div className={cn(single && "grid items-center gap-8 md:grid-cols-2 md:gap-12")}>
				<Reveal>
					<SectionHeader
						eyebrow={eyebrow}
						title={title}
						lead={lead}
						action={single ? undefined : action}
					/>
					{single ? <div className="mt-6">{action}</div> : null}
				</Reveal>
				<ul
					className={cn(
						"grid items-stretch gap-4 sm:gap-6",
						single ? "mx-auto w-full max-w-sm grid-cols-1" : "mt-8 grid-cols-2",
						columns === 2 && "mx-auto w-full max-w-3xl",
						columns === 3 && "lg:grid-cols-3",
						columns === 4 && "lg:grid-cols-4",
					)}
				>
					{artworks.map((art, index) => (
						<Reveal key={art.slug} as="li" variant="item" delayMs={gridStaggerDelay(index)}>
							<ArtworkCard
								artwork={art}
								siblings={siblings}
								priority={index < priorityCount}
								sizes={imageSizes}
								index={(catalogIndex[art.slug] ?? 0) + 1}
								total={totalCount}
							/>
						</Reveal>
					))}
				</ul>
			</div>
		</Section>
	);
}

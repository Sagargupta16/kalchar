import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HeroPlates } from "@/components/home/hero-plates";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { artworkPreloadSrcset } from "@/lib/image-base";
import { staggerDelay } from "@/lib/motion";
import type { Artwork, Site } from "@/lib/types";

/** Shared with hero-plates.tsx: the front plate caps at 22rem on desktop. */
const FEATURED_SIZES = "(min-width: 768px) 22rem, 85vw";

interface HeroProps {
	site: Site;
	featured: Artwork | undefined;
	secondary?: Artwork;
	/** Featured pieces the hero can shuffle through (includes `featured`). */
	pool: readonly Artwork[];
	/** slug -> catalog position, for the hero caption. */
	catalogIndex: Record<string, number>;
	totalCount: number;
	/** Category names for the chip rail (DB-backed, falls back to site.json). */
	styles: readonly string[];
}

/** The artwork and two clear actions lead; the headline paints before hydration. */
export function Hero({
	site,
	featured,
	secondary,
	pool,
	catalogIndex,
	totalCount,
	styles,
}: Readonly<HeroProps>) {
	return (
		<Section padded wash containerClassName="pt-8 pb-12 md:py-12">
			{featured ? (
				<link
					rel="preload"
					as="image"
					type="image/avif"
					imageSrcSet={artworkPreloadSrcset(featured.image, 800)}
					imageSizes={FEATURED_SIZES}
					fetchPriority="high"
				/>
			) : null}

			<div className="grid gap-7 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-12 md:gap-y-6">
				{/* Head: eyebrow + h1 */}
				<div className="md:col-span-5 md:row-start-1 md:self-end">
					<Reveal eager>
						<p className="text-sm font-medium text-accent-text">{site.brand.tagline}</p>
					</Reveal>

					<h1 className="t-headline mt-4 whitespace-pre-line text-display">
						{site.sections.hero?.title ?? site.brand.title}
					</h1>
				</div>

				{/* Plate: directly under the headline on phones, majority column on md+ */}
				{featured ? (
					<Reveal
						eager
						delayMs={staggerDelay(2)}
						className="mx-auto w-full max-w-xs py-4 sm:max-w-sm md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 md:max-w-[22rem] md:self-center"
					>
						<HeroPlates
							pool={pool}
							defaultFront={featured}
							defaultBack={secondary}
							catalogIndex={catalogIndex}
							totalCount={totalCount}
						/>
					</Reveal>
				) : null}

				{/* Body: lead + chips + CTAs */}
				<div className="md:col-span-5 md:col-start-1 md:row-start-2 md:self-start">
					<p className="t-lead max-w-xl">{site.brand.description}</p>

					<Reveal eager delayMs={staggerDelay(4)}>
						<div className="mt-6 flex flex-wrap gap-3">
							<Link href="/work" className={buttonVariants({ variant: "primary" })}>
								See the artwork
								<ArrowUpRight size={18} aria-hidden="true" />
							</Link>
							<Link href="/custom-orders" className={buttonVariants({ variant: "secondary" })}>
								Order a custom piece
							</Link>
						</div>
					</Reveal>
					<Reveal eager delayMs={staggerDelay(5)}>
						<nav aria-label="Browse by style" className="mt-4">
							<ul className="flex flex-wrap gap-x-4">
								{styles.map((style) => (
									<li key={style}>
										<Link
											href={`/work?style=${encodeURIComponent(style)}`}
											className="inline-flex min-h-control items-center text-sm text-muted underline-offset-4 transition-colors hover:text-accent-text hover:underline"
										>
											{style}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					</Reveal>
				</div>
			</div>
		</Section>
	);
}

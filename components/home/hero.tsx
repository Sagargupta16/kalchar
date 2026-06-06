import Link from "next/link";
import { HeroPlates } from "@/components/home/hero-plates";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { artworkPreloadSrcset } from "@/lib/image-base";
import type { Artwork, Site } from "@/lib/types";

const FEATURED_SIZES = "(min-width: 768px) 40vw, 85vw";

interface HeroProps {
	site: Site;
	featured: Artwork | undefined;
	secondary?: Artwork;
	/** Featured pieces the hero can shuffle through (includes `featured`). */
	pool: readonly Artwork[];
	/** slug -> catalog position, for the hero caption. */
	catalogIndex: Record<string, number>;
	totalCount: number;
}

export function Hero({
	site,
	featured,
	secondary,
	pool,
	catalogIndex,
	totalCount,
}: Readonly<HeroProps>) {
	return (
		<section className="relative overflow-hidden border-b border-line">
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

			<Container className="relative py-(--section-py)">
				<div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-12">
					{/* Text column */}
					<div className="md:col-span-7">
						<Reveal eager>
							<p className="t-eyebrow flex items-center gap-2">
								<span aria-hidden="true" className="text-gold-leaf">
									✦
								</span>
								{site.brand.tagline}
							</p>
						</Reveal>

						<Reveal
							eager
							delayMs={80}
							as="h1"
							className="t-display mt-4 text-5xl sm:text-6xl md:text-7xl"
						>
							<span className="block">
								<span className="not-italic">{site.brand.headline.latinPrefix}</span>
								<span
									lang="hi"
									className="flare-after relative inline-block font-devanagari not-italic text-accent"
								>
									{site.brand.headline.devanagariCore}
								</span>
							</span>
							<span className="mt-2 block text-2xl text-muted sm:text-3xl md:text-4xl">
								<span className="not-italic">{site.brand.headline.connector}</span>{" "}
								<span>{site.brand.headline.suffix}</span>
							</span>
						</Reveal>

						<p className="t-lead mt-6 max-w-xl">
							<SplitText text={site.brand.description} startDelayMs={400} />
						</p>

						{/* Style chips */}
						<Reveal eager delayMs={180}>
							<ul className="mt-7 flex flex-wrap gap-2" aria-label="Art styles">
								{site.styles.map((style) => (
									<li key={style}>
										<Badge>{style}</Badge>
									</li>
								))}
							</ul>
						</Reveal>

						{/* CTAs */}
						<Reveal eager delayMs={260}>
							<div className="mt-8 flex flex-wrap gap-3">
								<Link href="/work" className={buttonVariants({ variant: "primary" })}>
									See the work
								</Link>
								<Link href="/custom-orders" className={buttonVariants({ variant: "secondary" })}>
									Order a custom piece
								</Link>
							</div>
						</Reveal>
					</div>

					{/* Featured artwork plates (shuffle on reload, client island) */}
					{featured ? (
						<Reveal eager delayMs={120} className="md:col-span-5">
							<HeroPlates
								pool={pool}
								defaultFront={featured}
								defaultBack={secondary}
								catalogIndex={catalogIndex}
								totalCount={totalCount}
							/>
						</Reveal>
					) : null}
				</div>
			</Container>
		</section>
	);
}

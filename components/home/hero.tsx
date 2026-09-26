import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HERO_FEATURED_SIZES, HeroPlates } from "@/components/home/hero-plates";
import { StyleMarquee } from "@/components/home/style-marquee";
import { KineticText } from "@/components/motion/kinetic-text";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { artworkPreloadSrcset } from "@/lib/image-base";
import { staggerDelay } from "@/lib/motion";
import type { Artwork, Site } from "@/lib/types";

/** The headline's first word follows the tagline's slide by one kinetic step. */
const HEADLINE_START = { "--kinetic-delay": "120ms" } as CSSProperties;

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

/**
 * The artwork and two clear actions lead. The headline is poster scale
 * (52px on phones, 104px on desktop) and enters as kinetic type: each word
 * rides up out of its own mask on a 70ms stagger, "life." lands last in the
 * accent italic. The copy is real server HTML from the first byte (SEO,
 * no-JS, e2e); only transform animates, in CSS, so it never waits for React.
 */
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
		<>
			<Section padded wash containerClassName="pt-8 pb-14 lg:pt-14 lg:pb-20">
				{featured ? (
					<link
						rel="preload"
						as="image"
						type="image/avif"
						imageSrcSet={artworkPreloadSrcset(featured.image, 800)}
						imageSizes={HERO_FEATURED_SIZES}
						fetchPriority="high"
					/>
				) : null}

				<div className="grid gap-8 lg:grid-cols-12 lg:grid-rows-[auto_auto] lg:gap-x-10 lg:gap-y-8">
					{/* Head: tagline + h1 */}
					<div className="lg:col-span-7 lg:row-start-1 lg:self-end">
						<p className="eyebrow-eager flex items-center gap-3 text-sm font-medium text-accent-text">
							<span aria-hidden="true" className="h-px w-10 bg-accent" />
							{site.brand.tagline}
						</p>

						<h1 className="t-headline type-hero kinetic-eager mt-5" style={HEADLINE_START}>
							<KineticText text={site.sections.hero?.title ?? site.brand.title} accentLast />
						</h1>
					</div>

					{/* Body: lead + chips + CTAs */}
					<div className="lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:self-start">
						<p className="t-lead max-w-xl">{site.brand.description}</p>

						<Reveal eager delayMs={staggerDelay(4)}>
							<div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
								<Link href="/work" className={buttonVariants({ variant: "primary", size: "lg" })}>
									See the artwork
									<ArrowUpRight size={18} aria-hidden="true" />
								</Link>
								<Link
									href="/custom-orders"
									className={buttonVariants({ variant: "secondary", size: "lg" })}
								>
									Order a custom piece
								</Link>
							</div>
						</Reveal>
						<Reveal eager delayMs={staggerDelay(5)}>
							<nav aria-label="Browse by style" className="mt-5">
								<ul className="flex flex-wrap gap-2">
									{styles.map((style) => (
										<li key={style}>
											<Link
												href={`/work?style=${encodeURIComponent(style)}`}
												className="inline-flex min-h-control items-center rounded-full border border-line px-4 text-sm font-medium text-muted transition-ui pressable hover:border-accent hover:text-accent-text"
											>
												{style}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						</Reveal>
					</div>

					{/* Actions precede the artwork on phones; the desktop plate stays alongside. */}
					{featured ? (
						<Reveal
							eager
							delayMs={staggerDelay(2)}
							className="mx-auto w-full max-w-xs py-4 sm:max-w-sm lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:max-w-[24rem] lg:self-center"
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
				</div>
			</Section>
			<StyleMarquee styles={styles} />
		</>
	);
}

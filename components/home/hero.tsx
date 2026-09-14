import Link from "next/link";
import { HeroPlates } from "@/components/home/hero-plates";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { artworkPreloadSrcset } from "@/lib/image-base";
import { staggerDelay } from "@/lib/motion";
import type { Artwork, Site } from "@/lib/types";

/** Shared with hero-plates.tsx: the front plate caps at 35rem in the md+ seven-column cell. */
const FEATURED_SIZES = "(min-width: 768px) 35rem, 85vw";

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
	/** Prefilled wa.me greeting, shared with the contact teaser (C1/C4). */
	whatsappHref: string;
}

/**
 * Editorial museum hero (visual-direction 2.1). Phone order is Head, Plate,
 * Body so the painting sits inside the first screen; md+ gives the plates the
 * majority column (copy 5 / plates 7) inside a viewport-height shell capped
 * at 52rem, with the organic pigment wash drifting behind (Section `wash`).
 * The h1 carries the roman headline voice on the display rung. Ruling 44:
 * the h1 and the lead render in full immediately (no Reveal of any kind);
 * the eager stagger covers only the secondary elements and skips their
 * indexes (1 and 3) so the rhythm holds.
 */
export function Hero({
	site,
	featured,
	secondary,
	pool,
	catalogIndex,
	totalCount,
	styles,
	whatsappHref,
}: Readonly<HeroProps>) {
	return (
		<Section
			padded
			rhythm="grand"
			wash
			className="md:grid md:content-center md:max-h-[52rem] md:min-h-[calc(100dvh-var(--header-h-shrunk))]"
		>
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

			<div className="grid gap-8 md:grid-cols-12 md:grid-rows-[auto_auto] md:gap-x-12 md:gap-y-6">
				{/* Head: eyebrow + h1 */}
				<div className="md:col-span-5 md:row-start-1 md:self-end">
					<Reveal eager>
						<p className="t-eyebrow flex items-center gap-2">
							<span aria-hidden="true" className="text-gold-leaf">
								✦
							</span>
							{site.brand.tagline}
						</p>
					</Reveal>

					<h1 className="t-headline mt-4 text-display [--devanagari-shift:-0.02em]">
						<span className="block">
							{site.brand.headline.latinPrefix}
							<span
								lang="hi"
								className="devanagari-display flare-after relative inline-block text-accent"
							>
								{site.brand.headline.devanagariCore}
							</span>
						</span>
						<span className="t-headline mt-3 block text-title text-muted">
							{site.brand.headline.connector} {site.brand.headline.suffix}
						</span>
					</h1>
				</div>

				{/* Plate: directly under the headline on phones, majority column on md+ */}
				{featured ? (
					<Reveal
						eager
						delayMs={staggerDelay(2)}
						className="mx-auto w-full max-w-xs sm:max-w-sm md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 md:max-w-[35rem] md:self-center"
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
					<p className="t-lead line-clamp-2 max-w-xl md:line-clamp-none">
						{site.brand.description}
					</p>

					<Reveal eager delayMs={staggerDelay(4)}>
						<nav aria-label="Browse by style">
							<ul className="mt-6 flex flex-wrap gap-2">
								{styles.map((style) => (
									<li key={style}>
										<Link
											href={`/work?style=${encodeURIComponent(style)}`}
											className="group relative inline-flex rounded-full after:absolute after:inset-x-0 after:-inset-y-1"
										>
											<Badge className="min-h-9 px-3 transition-ui group-hover:border-accent group-hover:text-accent-text">
												{style}
											</Badge>
										</Link>
									</li>
								))}
							</ul>
						</nav>
					</Reveal>

					<Reveal eager delayMs={staggerDelay(5)}>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link href="/work" className={buttonVariants({ variant: "primary" })}>
								See the artwork
							</Link>
							<Link href="/custom-orders" className={buttonVariants({ variant: "secondary" })}>
								Order a custom piece
							</Link>
						</div>
						<a
							href={whatsappHref}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-4 inline-flex min-h-control items-center gap-2 text-sm font-medium text-accent-text underline-offset-4 transition-colors pressable hover:underline"
						>
							<WhatsAppIcon className="size-4" aria-hidden="true" />
							Message on WhatsApp
						</a>
					</Reveal>
				</div>
			</div>
		</Section>
	);
}

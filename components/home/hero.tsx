import Link from "next/link";
import { ArtImage } from "@/components/gallery/art-image";
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
	featuredIndex: number;
	totalCount: number;
}

export function Hero({
	site,
	featured,
	secondary,
	featuredIndex,
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

					{/* Featured artwork plates */}
					{featured ? (
						<Reveal eager delayMs={120} className="md:col-span-5">
							<div className="relative aspect-3/4">
								{secondary ? (
									<div
										aria-hidden="true"
										className="absolute inset-0 translate-x-[6%] translate-y-[4%] rotate-[4deg] overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-lg ring-1 ring-black/5 motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:rotate-0 motion-reduce:opacity-60 dark:ring-white/5"
									>
										<ArtImage
											src={`/artworks/${secondary.image}`}
											alt=""
											sizes={FEATURED_SIZES}
											maxWidth={800}
											className="absolute inset-0 h-full w-full object-cover"
										/>
									</div>
								) : null}
								<Link
									href={`/work/${featured.slug}`}
									className="group absolute inset-0 block -rotate-[5deg] focus-visible:outline-none motion-reduce:rotate-0"
									aria-label={`Featured work: ${featured.title}`}
								>
									<div className="relative h-full overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-xl ring-1 ring-black/10 transition-shadow duration-(--duration-base) ease-(--ease-out) group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent dark:ring-white/10">
										<ArtImage
											src={`/artworks/${featured.image}`}
											alt={featured.description ?? featured.title}
											sizes={FEATURED_SIZES}
											maxWidth={800}
											priority
											className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.02]"
										/>
									</div>
								</Link>
							</div>
							{/* Featured caption */}
							<div className="mt-6">
								{featuredIndex >= 0 ? (
									<p className="flex items-center gap-2 text-muted">
										<span aria-hidden="true" className="text-gold-leaf">
											✦
										</span>
										<span className="t-meta">
											Featured . {featuredIndex + 1} of {totalCount}
										</span>
									</p>
								) : null}
								<p className="mt-2 flex items-baseline justify-between gap-3">
									<span className="t-display text-lg sm:text-xl">{featured.title}</span>
									<span className="t-meta whitespace-nowrap">{featured.style}</span>
								</p>
							</div>
						</Reveal>
					) : null}
				</div>
			</Container>
		</section>
	);
}

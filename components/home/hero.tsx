import Link from "next/link";
import { InkSplash } from "@/components/decor/ink-splash";
import { PigmentWash } from "@/components/decor/pigment-wash";
import { ArtImage } from "@/components/gallery/art-image";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { buttonVariants } from "@/components/ui/button";
import { artworkPreloadSrcset } from "@/lib/image-base";
import type { Artwork, Site } from "@/lib/types";

/** sizes hint shared by the featured <img> and its preload link -- must match. */
const FEATURED_SIZES = "(min-width: 768px) 40vw, 90vw";

/**
 * Home hero: artist brand, animated headline, capability chip rail, primary
 * CTAs, and the featured artwork plate (LCP). Watercolor backdrop layers sit
 * behind the content.
 */
export function Hero({
	site,
	featured,
	featuredIndex,
	totalCount,
}: Readonly<{
	site: Site;
	featured: Artwork | undefined;
	featuredIndex: number;
	totalCount: number;
}>) {
	return (
		<section className="relative overflow-hidden border-b border-line">
			{/* Preload the featured artwork (the LCP element) so the browser's
			    preload scanner starts the fetch during HTML parse, not after it
			    discovers the <picture>. Next hoists this <link> into <head>.
			    imageSrcSet/imageSizes mirror the <img> so no extra variant loads. */}
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
			<PigmentWash />
			<InkSplash
				density="rich"
				tone2="var(--color-marigold)"
				className="left-[-20%] top-[-15%] h-[120%] w-[90%] sm:left-[-10%] sm:w-[70%]"
			/>
			<InkSplash
				align="right"
				density="subtle"
				tone="var(--color-peacock)"
				className="right-[-15%] top-[20%] h-[80%] w-[70%] sm:w-[55%]"
			/>
			<div className="relative mx-auto grid max-w-6xl gap-10 px-(--container-px) py-(--section-py) md:grid-cols-12 md:items-center md:gap-12">
				<div className="md:col-span-7">
					<Reveal eager>
						<p className="t-eyebrow">{site.brand.tagline}</p>
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
					{/*
					 * Capability chip rail. Tells a visitor the styles Megha
					 * works in before they scroll. Mobile-first: wraps to
					 * multi-row, smaller chips. The rail uses ruling +
					 * uppercase tracking so it reads as positioning, not
					 * navigation -- the same data drives the /work filter,
					 * which is the actual click target.
					 */}
					<Reveal eager delayMs={180}>
						<ul className="mt-7 flex flex-wrap gap-x-2 gap-y-2 sm:gap-x-3" aria-label="Styles">
							{site.styles.map((style) => (
								<li
									key={style}
									className="rounded-full border border-line bg-bg-soft px-3 py-1 text-[0.65rem] uppercase tracking-meta text-muted sm:text-[0.7rem]"
								>
									{style}
								</li>
							))}
						</ul>
					</Reveal>
					<Reveal eager delayMs={260}>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link href="/work" className={buttonVariants({ variant: "primary" })}>
								See the work
							</Link>
							<Link href="/custom-orders" className={buttonVariants({ variant: "ghost" })}>
								Order a custom piece
							</Link>
						</div>
					</Reveal>
				</div>

				{featured ? (
					<Reveal eager delayMs={120} className="md:col-span-5">
						<Link
							href={`/work/${featured.slug}`}
							className="group block focus-visible:outline-none"
							aria-label={`Featured work: ${featured.title}`}
						>
							<div className="relative aspect-3/4 overflow-hidden rounded-md bg-bg-soft ring-1 ring-black/10 transition-shadow group-hover:ring-accent dark:ring-white/10">
								<ArtImage
									src={`/artworks/${featured.image}`}
									alt={featured.description ?? featured.title}
									sizes={FEATURED_SIZES}
									maxWidth={800}
									priority
									className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-out-soft group-hover:scale-[1.02]"
								/>
							</div>
							{featuredIndex >= 0 ? (
								<p className="mt-4 flex items-center gap-3 text-muted">
									<span aria-hidden="true" className="h-px w-6 bg-accent" />
									<span className="t-meta">
										Featured . {featuredIndex + 1} of {totalCount}
									</span>
								</p>
							) : null}
							<p className="mt-2 flex items-baseline justify-between gap-3">
								<span className="t-display text-lg italic transition-colors group-hover:text-accent sm:text-xl">
									{featured.title}
								</span>
								<span className="t-meta whitespace-nowrap">{featured.style}</span>
							</p>
						</Link>
					</Reveal>
				) : null}
			</div>
		</section>
	);
}

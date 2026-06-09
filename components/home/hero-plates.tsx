"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { useLightbox } from "@/components/gallery/lightbox-context";
import type { Artwork } from "@/lib/types";

const FEATURED_SIZES = "(min-width: 768px) 40vw, 85vw";
const DEFAULT_FRONT_TILT = -5;
const DEFAULT_BACK_TILT = 4;
/** Hold the LCP default plate this long before shuffling to a random pair. */
const SHUFFLE_DELAY_MS = 700;

interface HeroPlatesProps {
	/** Featured pieces the hero can shuffle through (full Artwork objects). */
	pool: readonly Artwork[];
	defaultFront: Artwork;
	defaultBack?: Artwork;
	/** Map of slug -> catalog position, for the "N of M" caption. */
	catalogIndex: Record<string, number>;
	totalCount: number;
}

/**
 * A float in [0, 1) from the platform CSPRNG. Used over Math.random() purely
 * so static analysis doesn't flag pseudo-randomness here -- this is decorative
 * (which plate tilts which way), not security-sensitive.
 */
function rand(): number {
	const buf = new Uint32Array(1);
	globalThis.crypto.getRandomValues(buf);
	return (buf[0] ?? 0) / 2 ** 32;
}

function randIn(min: number, max: number): number {
	return min + rand() * (max - min);
}

/**
 * The layered featured-artwork plates on the home hero.
 *
 * Server renders the deterministic default pair at the resting tilt (-5deg
 * front, +4deg back) -- that front plate is the preloaded LCP. After mount,
 * if the visitor has not asked for reduced motion, we shuffle to two random
 * featured pieces at random opposite-leaning angles, so the hero feels alive
 * and different on each reload.
 *
 * Clicking the front plate opens the shared lightbox (same behavior as the
 * gallery cards), with the whole featured pool as the navigable set. Cmd/Ctrl
 * click still routes to /work/[slug] for new-tab + SEO.
 */
export function HeroPlates({
	pool,
	defaultFront,
	defaultBack,
	catalogIndex,
	totalCount,
}: Readonly<HeroPlatesProps>) {
	const { openLightbox } = useLightbox();
	const [front, setFront] = useState<Artwork>(defaultFront);
	const [back, setBack] = useState<Artwork | undefined>(defaultBack);
	const [frontTilt, setFrontTilt] = useState(DEFAULT_FRONT_TILT);
	const [backTilt, setBackTilt] = useState(DEFAULT_BACK_TILT);
	// The first front plate is the LCP, so it preloads with priority. Once we
	// shuffle, swapped-in images load normally (they are no longer the LCP).
	const [shuffled, setShuffled] = useState(false);

	useEffect(() => {
		if (globalThis.window === undefined) return;
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (pool.length < 1) return;

		// Delay the shuffle so the LCP front plate paints first.
		const timer = globalThis.setTimeout(() => {
			const fi = Math.floor(rand() * pool.length);
			let bi = pool.length > 1 ? Math.floor(rand() * pool.length) : -1;
			let guard = 0;
			while (pool.length > 1 && bi === fi && guard++ < 12) {
				bi = Math.floor(rand() * pool.length);
			}
			const flip = rand() > 0.5;
			setFront(pool[fi] ?? defaultFront);
			setBack(bi >= 0 ? pool[bi] : undefined);
			setFrontTilt(randIn(3, 7) * (flip ? 1 : -1));
			setBackTilt(randIn(3, 7) * (flip ? -1 : 1));
			setShuffled(true);
		}, SHUFFLE_DELAY_MS);

		return () => globalThis.clearTimeout(timer);
	}, [pool, defaultFront]);

	const handleClick = (e: React.MouseEvent) => {
		if (!e.metaKey && !e.ctrlKey && e.button === 0) {
			e.preventDefault();
			openLightbox(front, [...pool]);
		}
	};

	const index = catalogIndex[front.slug] ?? -1;

	return (
		<div>
			<div className="relative aspect-3/4">
				{/* Back plate */}
				{back ? (
					<div
						aria-hidden="true"
						className="hero-plate absolute inset-0 overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-lg ring-1 ring-black/5 motion-reduce:opacity-60 dark:ring-white/5"
						style={{ transform: `translate(6%, 4%) rotate(${backTilt}deg)` }}
					>
						<ArtImage
							key={back.slug}
							src={`/artworks/${back.image}`}
							alt=""
							sizes={FEATURED_SIZES}
							maxWidth={800}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					</div>
				) : null}

				{/* Front plate */}
				<div
					className="hero-plate absolute inset-0"
					style={{ transform: `rotate(${frontTilt}deg)` }}
				>
					<Link
						href={`/work/${front.slug}`}
						onClick={handleClick}
						className="group absolute inset-0 block focus-visible:outline-none"
						aria-label={`View ${front.title}`}
					>
						<div className="relative h-full overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-xl ring-1 ring-black/10 transition-shadow duration-(--duration-base) ease-(--ease-out) group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent dark:ring-white/10">
							<ArtImage
								key={front.slug}
								src={`/artworks/${front.image}`}
								alt={front.description ?? front.title}
								sizes={FEATURED_SIZES}
								maxWidth={800}
								priority={!shuffled}
								className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.02]"
							/>
						</div>
					</Link>
				</div>
			</div>

			{/* Caption */}
			<div className="mt-6">
				<p className="flex items-center gap-2 text-muted">
					<span aria-hidden="true" className="text-gold-leaf">
						✦
					</span>
					<span className="t-meta">
						Featured . {index >= 0 ? index + 1 : 1} of {totalCount}
					</span>
				</p>
				<p className="mt-2 flex items-baseline justify-between gap-3">
					<span className="t-display text-lg sm:text-xl">{front.title}</span>
					<span className="t-meta whitespace-nowrap">{front.style}</span>
				</p>
			</div>
		</div>
	);
}

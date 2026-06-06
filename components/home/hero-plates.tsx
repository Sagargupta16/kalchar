"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";

const FEATURED_SIZES = "(min-width: 768px) 40vw, 85vw";
const DEFAULT_FRONT_TILT = -5;
const DEFAULT_BACK_TILT = 4;

export interface HeroPiece {
	slug: string;
	title: string;
	style: string;
	image: string;
	description?: string;
	/** Position in the full catalog, for the "N of M" caption. */
	catalogIndex: number;
}

interface HeroPlatesProps {
	pool: readonly HeroPiece[];
	defaultFront: HeroPiece;
	defaultBack?: HeroPiece;
	totalCount: number;
}

function randIn(min: number, max: number): number {
	return min + Math.random() * (max - min);
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
 * Tilt is driven by an inline transform + a `.hero-plate` CSS transition
 * (globals.css), so the rotation eases smoothly and a single reduced-motion
 * rule can flatten the whole stack. Images swap by remounting <ArtImage>
 * (keyed by slug), which replays its built-in settle fade.
 */
export function HeroPlates({
	pool,
	defaultFront,
	defaultBack,
	totalCount,
}: Readonly<HeroPlatesProps>) {
	const [front, setFront] = useState<HeroPiece>(defaultFront);
	const [back, setBack] = useState<HeroPiece | undefined>(defaultBack);
	const [frontTilt, setFrontTilt] = useState(DEFAULT_FRONT_TILT);
	const [backTilt, setBackTilt] = useState(DEFAULT_BACK_TILT);
	// The first front plate is the LCP, so it preloads with priority. Once we
	// shuffle, swapped-in images load normally (they are no longer the LCP).
	const [shuffled, setShuffled] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (pool.length < 1) return;

		// Delay the shuffle so the LCP front plate paints first.
		const timer = globalThis.setTimeout(() => {
			const fi = Math.floor(Math.random() * pool.length);
			let bi = pool.length > 1 ? Math.floor(Math.random() * pool.length) : -1;
			let guard = 0;
			while (pool.length > 1 && bi === fi && guard++ < 12) {
				bi = Math.floor(Math.random() * pool.length);
			}
			// Opposite leans, random magnitude; flip which side leans which way.
			const flip = Math.random() > 0.5;
			setFront(pool[fi] ?? defaultFront);
			setBack(bi >= 0 ? pool[bi] : undefined);
			setFrontTilt(randIn(3, 7) * (flip ? 1 : -1));
			setBackTilt(randIn(3, 7) * (flip ? -1 : 1));
			setShuffled(true);
		}, 700);

		return () => globalThis.clearTimeout(timer);
	}, [pool, defaultFront]);

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
						className="group absolute inset-0 block focus-visible:outline-none"
						aria-label={`Featured work: ${front.title}`}
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
						Featured . {front.catalogIndex + 1} of {totalCount}
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

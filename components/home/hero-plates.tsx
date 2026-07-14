"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import type { Artwork } from "@/lib/types";

const FEATURED_SIZES = "(min-width: 768px) 40vw, 85vw";
const DEFAULT_FRONT_TILT = -5;
const DEFAULT_BACK_TILT = 4;
/** Hold the LCP default plate this long before shuffling to a random pair. */
const SHUFFLE_DELAY_MS = 700;
const MIN_SHUFFLE_TILT = 3;
const MAX_SHUFFLE_TILT = 7;
const MAX_DISTINCT_PICK_ATTEMPTS = 12;

type ShuffleStatus = "pending" | "applied" | "skipped";

interface PreparedShuffle {
	front: Artwork;
	back?: Artwork;
	frontTilt: number;
	backTilt: number;
}

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

function preloadArtwork(artwork: Artwork): Promise<boolean> {
	return new Promise((resolve) => {
		const image = new globalThis.Image();
		image.onload = () => resolve(true);
		image.onerror = () => resolve(false);
		image.src = artworkBrowserImageUrl(artwork.image, 800, "avif");
	});
}

async function prepareShuffle(
	pool: readonly Artwork[],
	defaultFront: Artwork,
): Promise<PreparedShuffle | null> {
	const frontIndex = Math.floor(rand() * pool.length);
	let backIndex = pool.length > 1 ? Math.floor(rand() * pool.length) : -1;
	let attempts = 0;
	while (pool.length > 1 && backIndex === frontIndex && attempts++ < MAX_DISTINCT_PICK_ATTEMPTS) {
		backIndex = Math.floor(rand() * pool.length);
	}

	const front = pool[frontIndex] ?? defaultFront;
	const back = backIndex >= 0 ? pool[backIndex] : undefined;
	const candidates = back ? [front, back] : [front];
	const loaded = await Promise.all(candidates.map(preloadArtwork));
	if (loaded.includes(false)) return null;

	const flip = rand() > 0.5;
	return {
		front,
		back,
		frontTilt: randIn(MIN_SHUFFLE_TILT, MAX_SHUFFLE_TILT) * (flip ? 1 : -1),
		backTilt: randIn(MIN_SHUFFLE_TILT, MAX_SHUFFLE_TILT) * (flip ? -1 : 1),
	};
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
	const [shuffleStatus, setShuffleStatus] = useState<ShuffleStatus>("pending");

	useEffect(() => {
		if (globalThis.window === undefined) return;
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (pool.length < 1) return;

		let cancelled = false;
		// Delay the shuffle so the LCP front plate paints first.
		const timer = globalThis.setTimeout(async () => {
			const next = await prepareShuffle(pool, defaultFront);
			if (cancelled) return;
			if (!next) {
				setShuffleStatus("skipped");
				return;
			}
			setFront(next.front);
			setBack(next.back);
			setFrontTilt(next.frontTilt);
			setBackTilt(next.backTilt);
			setShuffled(true);
			setShuffleStatus("applied");
		}, SHUFFLE_DELAY_MS);

		return () => {
			cancelled = true;
			globalThis.clearTimeout(timer);
		};
	}, [pool, defaultFront]);

	const handleClick = (e: React.MouseEvent) => {
		if (!e.metaKey && !e.ctrlKey && e.button === 0) {
			e.preventDefault();
			openLightbox(front, [...pool]);
		}
	};

	const index = catalogIndex[front.slug] ?? -1;

	return (
		<div data-shuffle-status={shuffleStatus}>
			<div className="relative aspect-3/4">
				{/* Back plate */}
				{back ? (
					<div
						aria-hidden="true"
						className="hero-plate absolute inset-0 overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-e2 shadow-hairline motion-reduce:opacity-60"
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
						<div className="relative h-full overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-e3 transition-shadow duration-(--duration-base) ease-(--ease-out) group-hover:ring-1 group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent">
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
						Featured, {index >= 0 ? index + 1 : 1} of {totalCount}
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

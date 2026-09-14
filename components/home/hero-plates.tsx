"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { AccentRule } from "@/components/ui/accent-rule";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import { HERO_SHUFFLE_DELAY_MS } from "@/lib/motion";
import type { Artwork } from "@/lib/types";

/** Shared with hero.tsx: the front plate caps at 35rem in the md+ seven-column cell. */
const FEATURED_SIZES = "(min-width: 768px) 35rem, 85vw";
const DEFAULT_FRONT_TILT = -5;
const DEFAULT_BACK_TILT = 4;
const MIN_SHUFFLE_TILT = 3;
const MAX_SHUFFLE_TILT = 7;

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
	/** Map of slug -> catalog position, for the wall-label counter. */
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
	const backOffset = pool.length > 1 ? 1 + Math.floor(rand() * (pool.length - 1)) : 0;
	const backIndex = pool.length > 1 ? (frontIndex + backOffset) % pool.length : -1;

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
 * The layered featured-artwork plates on the home hero (visual-direction 2.1).
 *
 * Server renders the deterministic default pair at the resting tilt (-5deg
 * front, +4deg back) -- that front plate is the preloaded LCP. After mount,
 * if the visitor has not asked for reduced motion, we shuffle to two random
 * featured pieces at random opposite-leaning angles, so the hero feels alive
 * and different on each reload.
 *
 * The front plate sits in a PlateFrame with the resting gold inset and the
 * approved gold-leaf sheen loop (deferred 23, --sheen-every 8s); the back
 * plate takes a bare PlateFrame. Hover adds nothing on the hero: it already
 * rests at the top (no `group` on the link). Under the plates a museum wall
 * label carries the kept Featured glyph line as "✦ Featured · No. NN of T".
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
		// Release the pending will-change promise (H1): a skipped shuffle must not
		// leave the plates promoted forever under reduced motion or an empty pool.
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setShuffleStatus("skipped");
			return;
		}
		if (pool.length < 1) {
			setShuffleStatus("skipped");
			return;
		}

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
		}, HERO_SHUFFLE_DELAY_MS);

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
			<div className="relative aspect-3/4 max-h-[46dvh] md:max-h-none">
				{/* Back plate */}
				{back ? (
					<div
						aria-hidden="true"
						className="hero-plate absolute inset-0"
						style={{ transform: `translate(6%, 4%) rotate(${backTilt}deg)` }}
					>
						<PlateFrame className="h-full">
							<ArtImage
								key={back.slug}
								src={`/artworks/${back.image}`}
								alt=""
								sizes={FEATURED_SIZES}
								maxWidth={800}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</PlateFrame>
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
						className="pressable absolute inset-0 block rounded-(--radius-md)"
						aria-label={`View ${front.title}`}
					>
						<PlateFrame goldRest sheen className="h-full">
							<ArtImage
								key={front.slug}
								src={`/artworks/${front.image}`}
								alt={front.description ?? front.title}
								sizes={FEATURED_SIZES}
								maxWidth={800}
								priority={!shuffled}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</PlateFrame>
					</Link>
				</div>
			</div>

			{/* Museum wall label: "✦ Featured · No. NN of T" / italic title / STYLE · YEAR */}
			<div className="mt-6">
				<WallLabel
					variant="compact"
					index={index >= 0 ? index + 1 : 1}
					total={totalCount}
					title={front.title}
					meta={[front.style, front.year ? String(front.year) : ""]}
					stagger
					prefix={
						<>
							<span aria-hidden="true" className="text-gold-leaf">
								✦
							</span>
							<span>Featured ·</span>
						</>
					}
				/>
				<AccentRule variant="gold" className="mt-3 w-6" />
			</div>
		</div>
	);
}

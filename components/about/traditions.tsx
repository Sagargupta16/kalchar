import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import { Reveal } from "@/components/motion/reveal";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pigment per tile, cycling through the Madhubani set so neighbours never match. */
const PIGMENTS = [
	"var(--color-vermillion)",
	"var(--color-pichwai)",
	"var(--color-marigold)",
	"var(--color-peacock)",
	"var(--color-ruby)",
	"var(--color-accent)",
] as const;

interface TraditionsProps {
	styles: readonly string[];
	artworks: readonly Artwork[];
}

/**
 * The practice as its traditions: one tile per style that has work on the
 * walls, each a deep pigment band (the band-pigment remap, tinted per tile)
 * holding a representative painting at its own ratio, the style name and
 * its piece count. The tile lifts and its painting turns upright on hover;
 * every tile links to that style's lens on /work.
 */
export function Traditions({ styles, artworks }: Readonly<TraditionsProps>) {
	const tiles = styles
		.map((style) => {
			const pieces = artworks.filter((piece) => piece.style === style);
			return { style, count: pieces.length, cover: pieces[0] };
		})
		.filter((tile) => tile.count > 0);
	if (tiles.length === 0) return null;

	return (
		<ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
			{tiles.map((tile, i) => (
				<Reveal key={tile.style} as="li" delayMs={(i % 3) * 90}>
					<Link
						href={`/work?style=${encodeURIComponent(tile.style)}`}
						style={{ "--section-accent": PIGMENTS[i % PIGMENTS.length] } as CSSProperties}
						className="band-pigment group pressable block overflow-hidden rounded-(--radius-md) shadow-e2 transition-ui hover:-translate-y-1"
					>
						<div className="relative flex min-h-52 flex-col-reverse justify-between gap-4 p-4 sm:min-h-56 sm:flex-row sm:items-end sm:p-5">
							<div className="min-w-0">
								<p className="t-meta tabular-nums">
									{tile.count} {tile.count === 1 ? "piece" : "pieces"}
								</p>
								<h3 className="t-headline mt-1 text-title text-ink">{tile.style}</h3>
								<span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink">
									See the work
									<ArrowUpRight
										size={16}
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
									/>
								</span>
							</div>
							{tile.cover ? (
								<div
									className={cn(
										"relative w-16 shrink-0 self-end overflow-hidden rounded-md shadow-e3 ring-1 ring-(--color-gold-hairline) transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover:rotate-0 group-hover:scale-105 sm:w-28",
										i % 2 === 0 ? "rotate-6" : "-rotate-6",
									)}
									style={{ aspectRatio: tile.cover.aspectRatio }}
								>
									<ArtImage
										src={`/artworks/${tile.cover.image}`}
										alt=""
										sizes="7rem"
										maxWidth={400}
										className="absolute inset-0 h-full w-full object-contain"
									/>
								</div>
							) : null}
						</div>
					</Link>
				</Reveal>
			))}
		</ul>
	);
}

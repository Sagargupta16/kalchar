import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArtImage } from "@/components/gallery/art-image";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArtworkSiblingsNavProps {
	prev?: Artwork;
	next?: Artwork;
	className?: string;
}

/**
 * Prev / next in catalog order as two preview tiles: the neighbouring
 * painting at its own ratio (never cropped), the direction, its title and
 * style. The tile lifts and the painting settles larger on hover; the
 * arrow nudges toward where it leads.
 */
export function ArtworkSiblingsNav({ prev, next, className }: Readonly<ArtworkSiblingsNavProps>) {
	if (!prev && !next) return null;
	return (
		<nav aria-label="Browse other works" className={cn("grid gap-4 sm:grid-cols-2", className)}>
			{prev ? <SiblingTile art={prev} direction="prev" /> : <span aria-hidden="true" />}
			{next ? <SiblingTile art={next} direction="next" /> : <span aria-hidden="true" />}
		</nav>
	);
}

function SiblingTile({ art, direction }: Readonly<{ art: Artwork; direction: "prev" | "next" }>) {
	const isNext = direction === "next";
	const Arrow = isNext ? ArrowRight : ArrowLeft;
	return (
		<Link
			href={`/work/${art.slug}`}
			className={cn(
				"group flex min-h-control items-center gap-4 rounded-(--radius-md) border border-line bg-surface p-3 shadow-e1 transition-ui pressable elevate-e2 hover:-translate-y-1 hover:border-accent sm:gap-5",
				isNext && "flex-row-reverse text-right",
			)}
		>
			<span
				className="relative h-24 shrink-0 overflow-hidden rounded-md bg-canvas sm:h-32"
				style={{ aspectRatio: art.aspectRatio }}
			>
				<ArtImage
					src={`/artworks/${art.image}`}
					alt=""
					sizes="8rem"
					maxWidth={400}
					className="absolute inset-0 h-full w-full object-contain transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover:scale-110"
				/>
			</span>
			<span className="min-w-0 flex-1">
				<span className={cn("t-meta flex items-center gap-1.5", isNext && "justify-end")}>
					<Arrow
						size={14}
						aria-hidden="true"
						className={cn(
							"transition-transform group-hover:text-accent-text",
							isNext ? "order-last group-hover:translate-x-1" : "group-hover:-translate-x-1",
						)}
					/>
					{isNext ? "Next" : "Previous"}
				</span>
				<span className="t-display mt-1 block text-title transition-colors group-hover:text-accent-text">
					{art.title}
				</span>
				<span className="t-meta mt-1 block">{art.style}</span>
			</span>
		</Link>
	);
}

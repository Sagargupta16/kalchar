import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArtImage } from "@/components/gallery/art-image";
import { PlateFrame } from "@/components/gallery/plate-frame";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArtworkSiblingsNavProps {
	prev?: Artwork;
	next?: Artwork;
	/** True when a full-bleed section (testimonials) sits directly above: its own bottom padding is the step. */
	flush?: boolean;
}

const LINK =
	"group flex min-h-control items-center gap-3 py-2 transition-colors pressable hover:text-accent-text";

/** Small artwork thumbnail on the standard plate (gold inset line on hover). */
function SiblingThumb({ art }: Readonly<{ art: Artwork }>) {
	return (
		<PlateFrame className="size-14 shrink-0 rounded-(--radius-sm)">
			<ArtImage
				src={`/artworks/${art.image}`}
				alt=""
				sizes="56px"
				className="absolute inset-0 h-full w-full object-cover"
			/>
		</PlateFrame>
	);
}

/** Prev / next in catalog order so a visitor can sweep the archive without bouncing back to /work. */
export function ArtworkSiblingsNav({
	prev,
	next,
	flush = false,
}: Readonly<ArtworkSiblingsNavProps>) {
	if (!prev && !next) return null;
	return (
		<nav
			aria-label="Browse other works"
			className={cn(
				"grid gap-6 border-t border-line pt-8 sm:grid-cols-2",
				flush ? "mt-0" : "mt-(--space-canyon)",
			)}
		>
			{prev ? (
				<Link href={`/work/${prev.slug}`} className={cn(LINK, "text-left")}>
					<ArrowLeft
						size={16}
						aria-hidden="true"
						className="shrink-0 text-muted transition-colors group-hover:text-accent-text"
					/>
					<SiblingThumb art={prev} />
					<span>
						<span className="t-meta block">Previous</span>
						<span className="t-display text-h3">{prev.title}</span>
					</span>
				</Link>
			) : (
				<span aria-hidden="true" />
			)}
			{next ? (
				<Link href={`/work/${next.slug}`} className={cn(LINK, "justify-end text-right")}>
					<span>
						<span className="t-meta block">Next</span>
						<span className="t-display text-h3">{next.title}</span>
					</span>
					<SiblingThumb art={next} />
					<ArrowRight
						size={16}
						aria-hidden="true"
						className="shrink-0 text-muted transition-colors group-hover:text-accent-text"
					/>
				</Link>
			) : (
				<span aria-hidden="true" />
			)}
		</nav>
	);
}

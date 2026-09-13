import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
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
				flush ? "mt-0" : "mt-(--space-block)",
			)}
		>
			{prev ? (
				<Link href={`/work/${prev.slug}`} className={cn(LINK, "text-left")}>
					<ArrowLeft
						size={16}
						aria-hidden="true"
						className="shrink-0 text-muted transition-colors group-hover:text-accent-text"
					/>
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

import type { ReactNode } from "react";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClosingCtaProps {
	eyebrow?: string;
	title: string;
	body?: string;
	/**
	 * Exactly one Link or <a> styled with buttonVariants. Pass "w-full sm:w-auto"
	 * in its className so it fills the row on phones (Three CTAs is a smell).
	 */
	action: ReactNode;
	/** h2 by default; "p" when the page's outline already closes on an h2. */
	headingAs?: "h2" | "h3" | "p";
	className?: string;
}

/**
 * The one closing beat every public page ends on: eyebrow, display title, one
 * muted line, one action. Owns its offset from the block above (--space-block)
 * so pages never wrap it in mt-*. Consumers: /events, /workshops, /contact, and
 * /work/[slug] (public-gallery adopts it after this lands).
 */
export function ClosingCta({
	eyebrow,
	title,
	body,
	action,
	headingAs: Heading = "h2",
	className,
}: Readonly<ClosingCtaProps>) {
	return (
		<div
			data-slot="closing-cta"
			className={cn(
				cardVariants({ padding: "lg" }),
				"mt-(--space-block) flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<div className="min-w-0">
				{eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
				<Heading className={cn("t-display text-title", eyebrow && "mt-2")}>{title}</Heading>
				{body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
			</div>
			<div className="w-full shrink-0 sm:w-auto">{action}</div>
		</div>
	);
}

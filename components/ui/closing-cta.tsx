import type { ReactNode } from "react";
import { PigmentWash } from "@/components/decor/pigment-wash";
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
 * The one closing beat every public page ends on (visual-direction 2.9):
 * eyebrow, the title in the roman headline voice, one muted line, one action,
 * over a static pigment wash in the page's section accent (drift off; the
 * title tops out at the h2 rung so a card CTA never restates the page h1
 * (steering 2026-09-14; it measured 72px on the display-sm rung before); the
 * host is [contain:paint] so the -z-10 ellipses paint above the card ground).
 * Owns its offset from the block above (--space-block) so pages never wrap it
 * in mt-*. Consumers: /events, /workshops, /contact, and /work/[slug].
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
				"relative mt-(--space-block) flex flex-col items-start gap-4 overflow-hidden [contain:paint] md:grid md:grid-cols-12 md:items-center",
				className,
			)}
		>
			<PigmentWash drift={false} />
			<div className="min-w-0 md:col-span-7">
				{eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
				<Heading className={cn("t-headline text-title md:text-h2", eyebrow && "mt-2")}>
					{title}
				</Heading>
				{body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
			</div>
			<div className="w-full shrink-0 sm:w-auto md:col-span-5 md:w-full md:text-right">
				{action}
			</div>
		</div>
	);
}

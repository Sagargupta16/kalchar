"use client";

import type { CSSProperties, ReactNode } from "react";
import { PigmentWash } from "@/components/decor/pigment-wash";
import { KineticText } from "@/components/motion/kinetic-text";
import { useViewReveal } from "@/components/motion/use-view-reveal";
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
 * The one closing beat every public page ends on: a deep pigment slab in the
 * page's section accent (the home page's band language, pigment-band.css)
 * with cream type. It plays as one choreography when it scrolls in: the
 * eyebrow slides, every title word rides up out of its mask, then the body
 * and the action rise. A static pigment wash sits behind the copy, so
 * nothing loops once the entrance lands. Owns its offset from the block above
 * (--space-block) so pages never wrap it in mt-*. Consumers: /events,
 * /workshops, /contact.
 */
export function ClosingCta({
	eyebrow,
	title,
	body,
	action,
	headingAs: Heading = "h2",
	className,
}: Readonly<ClosingCtaProps>) {
	const [ref, state] = useViewReveal<HTMLDivElement>();
	const words = title.trim().split(/\s+/).length;
	const after = { "--after-step": Math.min(words, 6) } as CSSProperties;
	return (
		<div
			ref={ref}
			data-slot="closing-cta"
			data-motion-reveal
			data-reveal={state}
			className={cn(
				"band-pigment relative mt-(--space-block) dark:[--band-mix:42%] overflow-hidden rounded-(--radius-sheet) [contain:paint]",
				className,
			)}
		>
			<PigmentWash drift={false} />
			<div className="relative grid gap-6 p-(--card-pad-lg) sm:p-10 md:grid-cols-12 md:items-end md:gap-8 lg:p-14">
				<div className="min-w-0 md:col-span-8">
					{eyebrow ? (
						<p className="t-eyebrow reveal-eyebrow flex items-center gap-3">
							<span aria-hidden="true" className="h-px w-8 bg-(--section-accent)" />
							{eyebrow}
						</p>
					) : null}
					<Heading className={cn("t-headline type-section", eyebrow && "mt-3")}>
						<KineticText text={title} />
					</Heading>
					{body ? (
						<p
							className="reveal-after mt-4 max-w-xl text-base leading-relaxed text-muted"
							style={after}
						>
							{body}
						</p>
					) : null}
				</div>
				<div
					className="reveal-after w-full min-w-0 sm:w-auto md:col-span-4 md:justify-self-end"
					style={after}
				>
					{action}
				</div>
			</div>
		</div>
	);
}

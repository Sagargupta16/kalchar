"use client";

import { KineticText } from "@/components/motion/kinetic-text";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { Section } from "@/components/ui/section";
import "@/components/editorial/editorial.css";

/**
 * The artist's pull quote on a deep vermillion band: an oversized opening
 * mark in the gold, then the quote in the italic display voice at section
 * scale, every word riding up out of its mask when the band scrolls in.
 */
export function PullQuote({ quote }: Readonly<{ quote: string }>) {
	const [ref, state] = useViewReveal<HTMLQuoteElement>();
	return (
		<Section
			accent="vermillion"
			background="pigment"
			padded
			rhythm="grand"
			className="overflow-hidden [contain:paint]"
		>
			<blockquote ref={ref} data-reveal={state} className="relative mx-auto max-w-4xl text-center">
				<span
					aria-hidden="true"
					className="rise t-display block h-16 select-none text-[8rem] leading-none text-(--section-accent) sm:h-20 sm:text-[10rem]"
				>
					&ldquo;
				</span>
				<p className="t-display type-section mt-4 text-ink italic">
					<KineticText text={quote} />
				</p>
			</blockquote>
		</Section>
	);
}

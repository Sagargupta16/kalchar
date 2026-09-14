import { KachniRule } from "@/components/decor/kachni-rule";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { cardVariants } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TestimonialsProps {
	testimonials: readonly Testimonial[];
	heading?: string;
	/** @deprecated the home page now uses `seam`; the detail page passes nothing. */
	borderBottom?: boolean;
	/** Home page passes true: grand rhythm + the kachni seam (visual-direction 2.1 change 3).
	 *  The detail page omits it -- motifs never run on /work pages. */
	seam?: boolean;
}

/**
 * Quiet testimonial row. Renders nothing when empty, so an empty table never
 * ships a bare heading (same hide-at-zero rule as the "Available to buy" chip).
 * Quotes carry the pull-quote register (t-display text-title, visual-direction
 * 2.1 change 7); with three or more, the first figure spans the grid between
 * two gold hairlines as the centred pull quote. No avatars, no star ratings.
 */
export function Testimonials({
	testimonials,
	heading = "In their words",
	borderBottom = false,
	seam = false,
}: Readonly<TestimonialsProps>) {
	if (testimonials.length === 0) return null;
	const hasPullQuote = testimonials.length >= 3;

	return (
		<Section
			accent="marigold"
			padded
			rhythm={seam ? "grand" : "default"}
			borderBottom={borderBottom}
		>
			{seam ? <KachniRule form="long" className="mb-(--space-block)" /> : null}
			<Reveal>
				<h2 className="t-eyebrow flex items-center justify-center gap-2">
					<AccentRule />
					{heading}
					<AccentRule />
				</h2>
			</Reveal>
			<ul className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-2 lg:grid-cols-3">
				{testimonials.map((t, i) => {
					const isPullQuote = hasPullQuote && i === 0;
					return (
						<Reveal
							key={t.id}
							as="li"
							delayMs={staggerDelay(i)}
							className={isPullQuote ? "sm:col-span-2 lg:col-span-3" : undefined}
						>
							<figure
								className={cn(
									isPullQuote
										? "border-y border-(--color-gold-hairline) py-8 text-center"
										: cardVariants(),
									"flex h-full flex-col",
								)}
							>
								<blockquote className="t-display grow text-title text-pretty">
									&ldquo;{t.quote}&rdquo;
								</blockquote>
								<figcaption className="mt-4 text-sm text-muted">
									{t.authorName}
									{t.authorLocation ? `, ${t.authorLocation}` : ""}
								</figcaption>
							</figure>
						</Reveal>
					);
				})}
			</ul>
		</Section>
	);
}

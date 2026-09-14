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
	/** Home page passes true so the block joins the ruled rhythm; the detail page keeps no rule. */
	borderBottom?: boolean;
}

/**
 * Quiet testimonial row. Renders nothing when empty, so an empty table never
 * ships a bare heading (same hide-at-zero rule as the "Available to buy" chip).
 * Reuses the pull-quote register from /about; a marigold accent, no avatars,
 * no star ratings, staying in the site's understated voice.
 */
export function Testimonials({
	testimonials,
	heading = "In their words",
	borderBottom = false,
}: Readonly<TestimonialsProps>) {
	if (testimonials.length === 0) return null;

	return (
		<Section accent="marigold" padded borderBottom={borderBottom}>
			<Reveal>
				<h2 className="t-eyebrow flex items-center justify-center gap-2">
					<AccentRule />
					{heading}
					<AccentRule />
				</h2>
			</Reveal>
			<ul className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-2 lg:grid-cols-3">
				{testimonials.map((t, i) => (
					<Reveal key={t.id} as="li" delayMs={staggerDelay(i)}>
						<figure className={cn(cardVariants(), "flex h-full flex-col")}>
							<blockquote className="t-lead grow text-pretty">&ldquo;{t.quote}&rdquo;</blockquote>
							<figcaption className="mt-4 text-sm text-muted">
								{t.authorName}
								{t.authorLocation ? `, ${t.authorLocation}` : ""}
							</figcaption>
						</figure>
					</Reveal>
				))}
			</ul>
		</Section>
	);
}

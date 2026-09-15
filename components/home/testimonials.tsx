import { Reveal } from "@/components/motion/reveal";
import { cardVariants } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TestimonialsProps {
	testimonials: readonly Testimonial[];
	heading?: string;
	/** Optional divider below the section. */
	borderBottom?: boolean;
	/** Home sections use grand spacing; detail pages keep the default rhythm. */
	rhythm?: "default" | "grand";
}

/** Empty collections stay hidden; sparse collections keep their quotes centred and readable. */
export function Testimonials({
	testimonials,
	heading = "In their words",
	borderBottom = false,
	rhythm = "default",
}: Readonly<TestimonialsProps>) {
	if (testimonials.length === 0) return null;

	return (
		<Section accent="marigold" padded rhythm={rhythm} borderBottom={borderBottom}>
			<Reveal>
				<h2 className="t-eyebrow text-center">{heading}</h2>
			</Reveal>
			<ul
				className={cn(
					"mx-auto mt-(--space-block) grid gap-(--grid-gap)",
					testimonials.length === 1 ? "max-w-2xl" : "sm:grid-cols-2",
					testimonials.length === 2 && "max-w-4xl",
					testimonials.length >= 3 && "lg:grid-cols-3",
				)}
			>
				{testimonials.map((t, i) => {
					return (
						<Reveal key={t.id} as="li" delayMs={staggerDelay(i)}>
							<figure className={cn(cardVariants(), "flex h-full flex-col")}>
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

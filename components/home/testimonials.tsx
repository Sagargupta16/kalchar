import { Reveal } from "@/components/motion/reveal";
import type { Testimonial } from "@/lib/types";

/**
 * Quiet testimonial row. Renders nothing when empty, so an empty table never
 * ships a bare heading (same hide-at-zero rule as the "Available to buy" chip).
 * Reuses the pull-quote register from /about; a marigold accent, no avatars,
 * no star ratings, staying in the site's understated voice.
 */
export function Testimonials({
	testimonials,
	heading = "In their words",
}: Readonly<{ testimonials: readonly Testimonial[]; heading?: string }>) {
	if (testimonials.length === 0) return null;

	return (
		<section className="mx-auto max-w-6xl px-(--container-px) py-(--section-py)">
			<Reveal>
				<p className="t-eyebrow text-center">{heading}</p>
			</Reveal>
			<ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{testimonials.map((t, i) => (
					<Reveal key={t.id} as="li" delayMs={i * 60}>
						<figure className="flex h-full flex-col rounded-(--radius-md) border border-line bg-bg-soft/40 p-6">
							<blockquote className="t-lead grow text-pretty">&ldquo;{t.quote}&rdquo;</blockquote>
							<figcaption className="t-meta mt-4 normal-case tracking-normal text-muted">
								{t.authorName}
								{t.authorLocation ? `, ${t.authorLocation}` : ""}
							</figcaption>
						</figure>
					</Reveal>
				))}
			</ul>
		</section>
	);
}

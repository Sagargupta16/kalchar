import { getAllArtworkSlugs, getAllTestimonials } from "@/lib/data";
import { TestimonialsManager } from "../_components/testimonials-manager";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
	const [testimonials, slugs] = await Promise.all([getAllTestimonials(), getAllArtworkSlugs()]);

	return (
		<div className="max-w-3xl space-y-6">
			<section>
				<h2 className="text-sm font-semibold">Testimonials</h2>
				<p className="mt-1 text-xs text-muted">
					Words from buyers and workshop guests. A testimonial only appears in public once you place
					it:
				</p>
				<ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
					<li>
						<span className="font-medium text-ink">Feature</span> it to show it in the &ldquo;In
						their words&rdquo; row on the <span className="font-medium text-ink">home page</span>.
					</li>
					<li>
						<span className="font-medium text-ink">Link an artwork</span> to also show it on that
						piece&rsquo;s detail page.
					</li>
					<li>Leave both unset and it stays here in admin only, not shown anywhere public.</li>
				</ul>
			</section>
			<TestimonialsManager testimonials={[...testimonials]} artworkSlugs={[...slugs]} />
		</div>
	);
}

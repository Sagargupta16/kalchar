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
					Words from buyers and workshop guests. Feature a few to show them on the home page; link
					one to an artwork to have it appear on that piece&rsquo;s page.
				</p>
			</section>
			<TestimonialsManager testimonials={[...testimonials]} artworkSlugs={[...slugs]} />
		</div>
	);
}

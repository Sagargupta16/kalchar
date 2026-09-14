import { requireAdminPage } from "@/lib/admin-auth";
import { getAllTestimonials, getArtworkTitles } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { TestimonialsManager } from "../_components/testimonials-manager";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
	await requireAdminPage();
	const [testimonials, artworks] = await Promise.all([getAllTestimonials(), getArtworkTitles()]);

	return (
		<AdminPage
			title="Testimonials"
			description="Words from buyers and workshop guests. A testimonial only appears in public once you place it:"
			intro={
				<ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
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
			}
		>
			<TestimonialsManager testimonials={[...testimonials]} artworks={[...artworks]} />
		</AdminPage>
	);
}

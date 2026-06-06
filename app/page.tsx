import { ArtworkCard } from "@/components/gallery/artwork-card";
import { AboutTeaser } from "@/components/home/about-teaser";
import { ContactTeaser } from "@/components/home/contact-teaser";
import { CustomOrdersTeaser } from "@/components/home/custom-orders-teaser";
import { Hero } from "@/components/home/hero";
import { SectionShell } from "@/components/home/section-shell";
import { WorkshopsTeaser } from "@/components/home/workshops-teaser";
import { Reveal } from "@/components/motion/reveal";
import {
	getAllArtworks,
	getAllWorkshops,
	getAvailableArtworks,
	getFeaturedArtwork,
	getSite,
} from "@/lib/data";
import { extractPhoneFromWaUrl } from "@/lib/whatsapp";

export default async function HomePage() {
	const site = getSite();
	const [featured, all, available, allWorkshops] = await Promise.all([
		getFeaturedArtwork(),
		getAllArtworks(),
		getAvailableArtworks(),
		getAllWorkshops(),
	]);
	const phone = extractPhoneFromWaUrl(site.contact.whatsapp.url);

	const selected = all.filter((a) => a.featured && a.slug !== featured?.slug).slice(0, 6);
	const heroSecondary = selected[0];
	const workshopsPreview = allWorkshops.slice(0, 3);
	const featuredIndex = featured ? all.findIndex((a) => a.slug === featured.slug) : -1;

	return (
		<main>
			<Hero
				site={site}
				featured={featured}
				secondary={heroSecondary}
				featuredIndex={featuredIndex}
				totalCount={all.length}
			/>

			{selected.length > 0 ? (
				<SectionShell
					eyebrow="Selected work"
					title={site.sections.work?.title ?? "Selected pieces from the archive"}
					lead={site.sections.work?.lead}
					href="/work"
					hrefLabel="See all work"
				>
					<ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						{selected.map((art, i) => (
							<Reveal key={art.slug} as="li" delayMs={i * 60}>
								<ArtworkCard artwork={art} siblings={selected} priority={i < 3} />
							</Reveal>
						))}
					</ul>
				</SectionShell>
			) : null}

			{available.length > 0 ? (
				<SectionShell
					eyebrow="Available now"
					title="Pieces ready to find a home"
					lead="Each one ships from India. Tap to enquire."
					href="/work"
					hrefLabel="Browse the archive"
				>
					<ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
						{available.map((art, i) => (
							<Reveal key={art.slug} as="li" delayMs={i * 60}>
								<ArtworkCard artwork={art} siblings={available} priority={i < 3} />
							</Reveal>
						))}
					</ul>
				</SectionShell>
			) : null}

			<AboutTeaser
				eyebrow={site.sections.about?.eyebrow ?? "About"}
				title={site.sections.about?.title ?? "The practice"}
				lead={site.sections.about?.lead}
				location={site.brand.location}
			/>

			{workshopsPreview.length > 0 ? (
				<WorkshopsTeaser
					workshops={workshopsPreview}
					totalCount={allWorkshops.length}
					eyebrow={site.sections.workshops?.eyebrow ?? "Workshops"}
					title={site.sections.workshops?.title ?? "Hands-on sessions"}
					lead={site.sections.workshops?.lead}
				/>
			) : null}

			<CustomOrdersTeaser
				phone={phone}
				eyebrow={site.sections.customOrders?.eyebrow ?? "Custom orders"}
				title={site.sections.customOrders?.title ?? "Order a custom piece"}
				lead={site.sections.customOrders?.lead}
			/>

			<ContactTeaser
				contact={site.contact}
				eyebrow={site.sections.contact?.eyebrow ?? "Contact"}
				title={site.sections.contact?.title ?? "Get in touch"}
				lead={site.sections.contact?.lead}
			/>
		</main>
	);
}

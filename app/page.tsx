import { ArtworkCard } from "@/components/gallery/artwork-card";
import { AboutTeaser } from "@/components/home/about-teaser";
import { ContactTeaser } from "@/components/home/contact-teaser";
import { CustomOrdersTeaser } from "@/components/home/custom-orders-teaser";
import { EventsTeaser } from "@/components/home/events-teaser";
import { Hero } from "@/components/home/hero";
import { SectionShell } from "@/components/home/section-shell";
import { WorkshopsTeaser } from "@/components/home/workshops-teaser";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/ui/section";
import {
	getAllArtworks,
	getAllWorkshops,
	getAvailableArtworks,
	getCategoryNames,
	getFeaturedArtwork,
	getRecentEvents,
	getSetting,
	getSite,
} from "@/lib/data";
import { extractPhoneFromWaUrl } from "@/lib/whatsapp";

export default async function HomePage() {
	const site = getSite();
	const [
		featured,
		all,
		available,
		allWorkshops,
		categoryNames,
		recentEvents,
		showHomeIntro,
		profileImage,
	] = await Promise.all([
		getFeaturedArtwork(),
		getAllArtworks(),
		getAvailableArtworks(),
		getAllWorkshops(),
		getCategoryNames(),
		getRecentEvents(3),
		getSetting<boolean>("showHomeIntro"),
		getSetting<string>("profileImage"),
	]);
	const phone = extractPhoneFromWaUrl(site.contact.whatsapp.url);
	const aboutCopy = site.sections.about as { intro?: string } | undefined;

	const SELECTED_WORK_COUNT = 6;
	const WORKSHOPS_PREVIEW_COUNT = 3;
	const selected = all
		.filter((art) => art.featured && art.slug !== featured?.slug)
		.slice(0, SELECTED_WORK_COUNT);
	const heroSecondary = selected[0];
	const workshopsPreview = allWorkshops.slice(0, WORKSHOPS_PREVIEW_COUNT);

	// Pool the hero can shuffle through on reload: every featured piece (full
	// Artwork objects, so the lightbox has price/palette/dimensions). Falls back
	// to the whole catalog if nothing is explicitly featured.
	const heroSource = all.filter((a) => a.featured);
	const heroPool = heroSource.length > 0 ? heroSource : all;
	// slug -> catalog position, for the hero "N of M" caption.
	const catalogIndex: Record<string, number> = {};
	all.forEach((a, i) => {
		catalogIndex[a.slug] = i;
	});

	return (
		<main>
			<Hero
				site={site}
				featured={featured}
				secondary={heroSecondary}
				pool={heroPool}
				catalogIndex={catalogIndex}
				totalCount={all.length}
				styles={categoryNames}
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
				intro={showHomeIntro ? aboutCopy?.intro : undefined}
				profileImage={profileImage}
				monogram={site.brand.devanagariMark}
				publicName={site.brand.publicName}
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

			{recentEvents.length > 0 ? (
				<Section accent="peacock">
					<EventsTeaser
						events={recentEvents}
						eyebrow="Recent events"
						title="From the workshop floor"
						lead="Workshops held, exhibitions, and gatherings with the community."
					/>
				</Section>
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

import { KachniRule } from "@/components/decor/kachni-rule";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { GALLERY_LEAD_SIZES, GalleryGrid } from "@/components/gallery/gallery-grid";
import { AboutTeaser } from "@/components/home/about-teaser";
import { ContactTeaser } from "@/components/home/contact-teaser";
import { CustomOrdersTeaser } from "@/components/home/custom-orders-teaser";
import { EventsTeaser } from "@/components/home/events-teaser";
import { Hero } from "@/components/home/hero";
import { LeadUnveil } from "@/components/home/lead-unveil";
import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Testimonials } from "@/components/home/testimonials";
import { WorkshopsTeaser } from "@/components/home/workshops-teaser";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import {
	getAllArtworks,
	getAllWorkshops,
	getAvailableArtworks,
	getCategoryNames,
	getFeaturedArtwork,
	getFeaturedTestimonials,
	getRecentEvents,
	getSetting,
	getSite,
} from "@/lib/data";
import { shapeHomeCatalog } from "@/lib/home-catalog";
import { gridStaggerDelay, REVEAL_DISTANCE } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import type { SectionCopy } from "@/lib/types";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";

const WORKSHOPS_PREVIEW_COUNT = 3;
const WHATSAPP_GREETING = "Hi, I found you on kalchar.co.in.";
/** Home grids sit inside the lg spread's eight-column content area, so they
 *  stay two columns there and the spanLead first tile spans both
 *  (visual-direction 2.1 change 5). */
const HOME_GRID_CLASS = "lg:grid-cols-2";

// Home-specific metadata: the highest-traffic entry page (most visits arrive
// from WhatsApp/Instagram link-taps), so give it a unique, keyword-rich title
// and description rather than inheriting the generic root defaults.
export const metadata = createPageMetadata({
	title: "Madhubani, Pichwai & Lippan Folk Art",
	description:
		"Original Madhubani, Pichwai, Lippan and Gond folk paintings by Megha Seth, plus hands-on workshops rooted in Indian folk traditions. Browse the archive or commission a custom piece.",
	path: "/",
});

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
		testimonials,
	] = await Promise.all([
		getFeaturedArtwork(),
		getAllArtworks(),
		getAvailableArtworks(),
		getAllWorkshops(),
		getCategoryNames(),
		getRecentEvents(3),
		getSetting("showHomeIntro"),
		getSetting("profileImage"),
		getFeaturedTestimonials(),
	]);
	const phone = extractPhoneFromWaUrl(site.contact.whatsapp.url);
	const aboutCopy = site.sections.about as { intro?: string } | undefined;

	const {
		selected,
		availablePreview,
		heroPool,
		heroSecondary,
		catalogIndex,
		selectedCtaLabel,
		availableCtaLabel,
	} = shapeHomeCatalog({ all, available, featured });
	const workshopsPreview = allWorkshops.slice(0, WORKSHOPS_PREVIEW_COUNT);
	const workCopy = site.sections.work as (SectionCopy & { homeLead?: string }) | undefined;
	const availableCopy = site.sections.available;
	const eventsCopy = site.sections.events;
	const greetingWa = buildWhatsAppLink({ phoneE164NoPlus: phone, message: WHATSAPP_GREETING });

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
				whatsappHref={greetingWa}
			/>

			{selected.length > 0 ? (
				<Section id="work" padded rhythm="grand">
					<KachniRule form="long" className="mb-(--space-block)" />
					<Spread
						header={
							<Reveal>
								<SectionHeader
									eyebrow={workCopy?.eyebrow ?? "Selected work"}
									title={workCopy?.title ?? "Selected pieces from the archive"}
									lead={workCopy?.homeLead ?? workCopy?.lead}
								/>
							</Reveal>
						}
					>
						<GalleryGrid spanLead className={HOME_GRID_CLASS}>
							{selected.map((art, i) =>
								i === 0 ? (
									<LeadUnveil key={art.slug}>
										<ArtworkCard
											artwork={art}
											siblings={selected}
											priority
											index={(catalogIndex[art.slug] ?? 0) + 1}
											total={all.length}
											sizes={GALLERY_LEAD_SIZES}
										/>
									</LeadUnveil>
								) : (
									<Reveal
										key={art.slug}
										as="li"
										distance={REVEAL_DISTANCE.item}
										delayMs={gridStaggerDelay(i)}
									>
										<ArtworkCard
											artwork={art}
											siblings={selected}
											priority={i < 3}
											index={(catalogIndex[art.slug] ?? 0) + 1}
											total={all.length}
										/>
									</Reveal>
								),
							)}
						</GalleryGrid>
						<Reveal>
							<div className="mt-(--space-block)">
								<SectionCta href="/work">{selectedCtaLabel}</SectionCta>
							</div>
						</Reveal>
					</Spread>
				</Section>
			) : null}

			{availablePreview.length > 0 ? (
				<Section id="available" padded rhythm="grand">
					<KachniRule form="long" className="mb-(--space-block)" />
					<Spread
						header={
							<Reveal>
								<SectionHeader
									eyebrow={availableCopy?.eyebrow ?? "Available now"}
									title={availableCopy?.title ?? "Pieces ready to find a home"}
									lead={availableCopy?.lead}
								/>
							</Reveal>
						}
					>
						<GalleryGrid spanLead className={HOME_GRID_CLASS}>
							{availablePreview.map((art, i) =>
								i === 0 ? (
									<LeadUnveil key={art.slug}>
										<ArtworkCard
											artwork={art}
											siblings={available}
											index={(catalogIndex[art.slug] ?? 0) + 1}
											total={all.length}
											sizes={GALLERY_LEAD_SIZES}
										/>
									</LeadUnveil>
								) : (
									<Reveal
										key={art.slug}
										as="li"
										distance={REVEAL_DISTANCE.item}
										delayMs={gridStaggerDelay(i)}
									>
										<ArtworkCard
											artwork={art}
											siblings={available}
											index={(catalogIndex[art.slug] ?? 0) + 1}
											total={all.length}
										/>
									</Reveal>
								),
							)}
						</GalleryGrid>
						<Reveal>
							<div className="mt-(--space-block)">
								<SectionCta href="/work?view=available">{availableCtaLabel}</SectionCta>
							</div>
						</Reveal>
					</Spread>
				</Section>
			) : null}

			<AboutTeaser
				eyebrow={site.sections.about?.eyebrow ?? "About"}
				title={site.sections.about?.title ?? "The practice"}
				lead={site.sections.about?.lead}
				location={site.brand.location}
				tagline={site.brand.tagline}
				intro={showHomeIntro ? aboutCopy?.intro : undefined}
				profileImage={profileImage}
				monogram={site.brand.devanagariMark}
				publicName={site.brand.publicName}
			/>

			<Testimonials testimonials={testimonials} seam />

			{workshopsPreview.length > 0 ? (
				<WorkshopsTeaser
					workshops={workshopsPreview}
					eyebrow={site.sections.workshops?.eyebrow ?? "Workshops"}
					title={site.sections.workshops?.title ?? "Hands-on sessions"}
					lead={site.sections.workshops?.lead}
				/>
			) : null}

			{recentEvents.length > 0 ? (
				<EventsTeaser
					events={recentEvents}
					eyebrow={eventsCopy?.eyebrow ?? "Recent events"}
					title={eventsCopy?.title ?? "From the workshop floor"}
					lead={eventsCopy?.lead}
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
				whatsappHref={greetingWa}
			/>
		</main>
	);
}

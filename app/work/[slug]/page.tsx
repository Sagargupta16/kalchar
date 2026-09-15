import { ArrowLeft, Calendar, ImageIcon, Palette, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkCtaPanel } from "@/components/gallery/artwork-cta-panel";
import { ArtworkSiblingsNav } from "@/components/gallery/artwork-siblings-nav";
import { Chromacard } from "@/components/gallery/chromacard";
import { DetailPlate } from "@/components/gallery/detail-plate";
import { EnquiryBar } from "@/components/gallery/enquiry-bar";
import { WallLabel } from "@/components/gallery/wall-label";
import { Testimonials } from "@/components/home/testimonials";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import {
	getAllArtworkSlugs,
	getAllArtworks,
	getArtworkBySlug,
	getSite,
	getTestimonialsForArtwork,
} from "@/lib/data";
import { artworkImageUrl, artworkPreloadSrcset } from "@/lib/image-base";
import { staggerDelay } from "@/lib/motion";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { formatInr } from "@/lib/utils";
import { buildWhatsAppLink, buyArtworkMessage, extractPhoneFromWaUrl } from "@/lib/whatsapp";

/** sizes hint shared by the detail <img> and its preload link -- must match. */
const DETAIL_SIZES = "(min-width: 768px) 60vw, 100vw";
/** Largest variant the detail plate renders; also caps the preload srcset. */
const DETAIL_MAX_WIDTH = 800;
/** OG card image width (the 1200px webp variant). */
const OG_IMAGE_WIDTH = 1200;

interface PageProps {
	params: Promise<{ slug: string }>;
}

/** Fallback alt text when a piece has no description, shared by metadata + img. */
function artworkAlt(art: Pick<Artwork, "title" | "style" | "medium">): string {
	return `${art.title}, ${art.style} painting in ${art.medium}.`;
}

/**
 * schema.org VisualArtwork JSON-LD for one piece, mapping fields the catalog
 * already has. A priced, unsold piece nests an Offer (InStock); a sold piece
 * maps to SoldOut. Each work is a 1-of-1 original, so no artEdition. This is
 * the rich-result signal for an artwork catalog; the render pattern (a
 * <script type="application/ld+json">) mirrors app/layout.tsx.
 */
function artworkJsonLd(art: Artwork): Record<string, unknown> {
	const image = artworkImageUrl(art.image, OG_IMAGE_WIDTH, "webp");
	const offer = isPositivePrice(art.priceInr)
		? {
				"@type": "Offer",
				price: art.priceInr,
				priceCurrency: "INR",
				availability:
					art.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
				url: `${siteConfig.url}/work/${art.slug}/`,
			}
		: undefined;
	return {
		"@context": "https://schema.org",
		"@type": "VisualArtwork",
		name: art.title,
		image,
		artform: art.style,
		artMedium: art.medium,
		...(art.year ? { dateCreated: String(art.year) } : {}),
		...(art.dimensions ? { size: art.dimensions } : {}),
		creator: { "@type": "Person", name: getSite().brand.publicName },
		...(offer ? { offers: offer } : {}),
	};
}

export async function generateStaticParams() {
	return (await getAllArtworkSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const art = await getArtworkBySlug(slug);
	if (!art) return { title: "Artwork not found" };
	// aspectRatio is width/height, so height = width / ratio. Giving the OG image
	// real dimensions + alt lets social crawlers lay out the card without a fetch.
	const ogHeight = Math.round(OG_IMAGE_WIDTH / art.aspectRatio);
	// Product Rich Pin tags: a priced, unsold piece unfurls in WhatsApp/IG DMs
	// with its price. Only emitted when there's a real price to advertise.
	const productMeta =
		isPositivePrice(art.priceInr) && art.status !== "sold"
			? {
					"product:price:amount": String(art.priceInr),
					"product:price:currency": "INR",
					"product:availability": "in stock",
				}
			: undefined;
	return {
		title: art.title,
		description: art.description ?? artworkAlt(art),
		alternates: {
			canonical: `/work/${art.slug}/`,
		},
		openGraph: {
			title: art.title,
			description: art.description ?? artworkAlt(art),
			url: `/work/${art.slug}/`,
			images: [
				{
					url: artworkImageUrl(art.image, OG_IMAGE_WIDTH, "webp"),
					width: OG_IMAGE_WIDTH,
					height: ogHeight,
					alt: artworkAlt(art),
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: art.title,
			description: art.description ?? artworkAlt(art),
			images: [artworkImageUrl(art.image, OG_IMAGE_WIDTH, "webp")],
		},
		// og:type=product + product:price:* make a priced piece unfurl as a
		// Product Rich Pin. Emitted via `other` so the tags sit alongside the
		// openGraph block Next already renders.
		other: productMeta ? { "og:type": "product", ...productMeta } : undefined,
	};
}

/** Prev/next neighbours in catalog sort order, for sweeping through the archive. */
function getSiblings(all: readonly Artwork[], slug: string): { prev?: Artwork; next?: Artwork } {
	const idx = all.findIndex((a) => a.slug === slug);
	return {
		prev: idx > 0 ? all[idx - 1] : undefined,
		next: idx < all.length - 1 ? all[idx + 1] : undefined,
	};
}

/**
 * Artwork detail page (visual-direction 2.3, the B graft): art > label/name >
 * price > full-width Enquire, then the prose. Mobile flow: full-bleed plate
 * capped at 72dvh, museum wall label with the price in
 * the numeral voice, the CTA panel directly after, description and facts
 * below, with a sticky enquiry bar while the panel is off screen. Desktop
 * splits plate (sticky, 7 of 12) / info (5 of 12) at md.
 */
export default async function ArtworkDetailPage({ params }: Readonly<PageProps>) {
	const { slug } = await params;
	const art = await getArtworkBySlug(slug);
	if (!art) notFound();

	const [all, testimonials] = await Promise.all([
		getAllArtworks(),
		getTestimonialsForArtwork(art.slug),
	]);
	const { prev, next } = getSiblings(all, art.slug);
	const catalogIndex = all.findIndex((a) => a.slug === art.slug) + 1;

	const { contact } = getSite();
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: buyArtworkMessage(art),
	});

	const isAvailable = isPositivePrice(art.priceInr);
	const isSold = art.status === "sold";
	const cta = getCtaCopy(isAvailable, isSold);

	let priceSlot: string | undefined;
	if (isAvailable && typeof art.priceInr === "number" && !isSold) {
		priceSlot = formatInr(art.priceInr);
	}
	let statusSlot: string | undefined;
	if (isSold) statusSlot = "Sold";
	else if (!isAvailable) statusSlot = "Not listed for sale";

	return (
		<Container as="main" className="py-(--section-py)">
			{/* VisualArtwork structured data for rich results. Escape "<" to
			    < so an admin-entered title/dimension containing "</script>"
			    can't break out of the tag (the fields are DB-editable). */}
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD, angle brackets escaped below
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(artworkJsonLd(art)).replace(/</g, "\\u003c"),
				}}
			/>
			{/* Preload the artwork plate (the LCP element) so its fetch starts at
			    HTML parse. imageSrcSet/imageSizes mirror the <img> exactly. */}
			<link
				rel="preload"
				as="image"
				type="image/avif"
				imageSrcSet={artworkPreloadSrcset(art.image, DETAIL_MAX_WIDTH)}
				imageSizes={DETAIL_SIZES}
				fetchPriority="high"
			/>
			<Reveal eager>
				<Link
					href="/work"
					className="inline-flex min-h-control items-center gap-2 text-xs uppercase tracking-meta text-muted transition-colors hover:text-accent-text"
				>
					<ArrowLeft size={14} aria-hidden="true" />
					Back to artwork
				</Link>
			</Reveal>

			<div className="mt-(--space-block) grid gap-(--space-block) md:grid-cols-12 md:gap-12">
				{/* Image plate at the piece's own ratio, whole painting shown (D9);
				    never inside a Reveal (LCP, performance guard 3). */}
				<div className="min-w-0 md:col-span-7">
					<DetailPlate
						artwork={art}
						siblings={all}
						alt={art.description ?? artworkAlt(art)}
						sizes={DETAIL_SIZES}
						maxWidth={DETAIL_MAX_WIDTH}
					/>
				</div>

				{/* Info column: wall label (title as the h1), price,
				    full-width Enquire, then the prose and facts. */}
				<div className="min-w-0 md:col-span-5">
					<WallLabel
						variant="full"
						mark
						stagger
						index={catalogIndex}
						total={all.length}
						title={art.title}
						meta={[
							art.style,
							art.medium,
							art.year ? String(art.year) : "",
							art.dimensions ?? "",
						].filter(Boolean)}
						price={priceSlot}
						status={statusSlot}
						headingLevel="h1"
						titleClassName="md:text-h1"
						className="mt-4"
					/>
					{/* Honest scarcity: every piece is a single physical original.
					    No timers, no fake stock. */}
					{isAvailable && !isSold ? (
						<Reveal eager delayMs={staggerDelay(5)}>
							<p className="t-meta mt-4 normal-case tracking-normal">
								One of a kind, the only original. Not a print.
							</p>
						</Reveal>
					) : null}

					<Reveal delayMs={staggerDelay(5)}>
						<ArtworkCtaPanel
							art={art}
							whatsappLink={whatsappLink}
							cta={cta}
							isAvailable={isAvailable}
							isSold={isSold}
							whatsappDisplay={contact.whatsapp.display}
						/>
					</Reveal>

					{art.description ? (
						<Reveal delayMs={staggerDelay(2)}>
							<p className="t-body mt-(--space-block) max-w-(--measure-essay)">{art.description}</p>
						</Reveal>
					) : null}

					<Reveal delayMs={staggerDelay(3)}>
						<dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
							<dt className="t-meta normal-case tracking-normal">
								<span className="inline-flex items-center gap-1.5">
									<ImageIcon size={13} aria-hidden="true" /> Medium
								</span>
							</dt>
							<dd>{art.medium}</dd>
							{art.year ? (
								<>
									<dt className="t-meta normal-case tracking-normal">
										<span className="inline-flex items-center gap-1.5">
											<Calendar size={13} aria-hidden="true" /> Year
										</span>
									</dt>
									<dd>{art.year}</dd>
								</>
							) : null}
							{art.dimensions ? (
								<>
									<dt className="t-meta normal-case tracking-normal">
										<span className="inline-flex items-center gap-1.5">
											<Ruler size={13} aria-hidden="true" /> Dimensions
										</span>
									</dt>
									<dd>{art.dimensions}</dd>
								</>
							) : null}
						</dl>
					</Reveal>

					{art.palette && art.palette.length > 0 ? (
						<Reveal delayMs={staggerDelay(4)}>
							<div className="mt-6">
								<p className="t-meta inline-flex items-center gap-1.5 normal-case tracking-normal">
									<Palette size={13} aria-hidden="true" /> Palette
								</p>
								<Chromacard
									palette={art.palette}
									ariaLabel={`Palette sampled from ${art.title}`}
									className="mt-2"
								/>
							</div>
						</Reveal>
					) : null}
				</div>
			</div>

			{/* Testimonials tied to this piece (renders nothing when none). The
			    component brings its own max-width + padding, so drop it full-bleed
			    here rather than nesting it in the detail grid. The canyon seam
			    separates the label block from the related-pieces tail (1.5). */}
			{testimonials.length > 0 ? (
				<div className="-mx-(--container-px) mt-(--space-canyon)">
					<Testimonials testimonials={testimonials} heading="What collectors say" />
				</div>
			) : null}

			<ArtworkSiblingsNav prev={prev} next={next} flush={testimonials.length > 0} />

			{/* Phone-only sticky enquiry bar; hides while #enquire or the page end is on screen. */}
			<EnquiryBar price={priceSlot} href={whatsappLink} label={cta.label} watchId="enquire" />
		</Container>
	);
}

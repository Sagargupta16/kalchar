import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { ArtworkCtaPanel } from "@/components/gallery/artwork-cta-panel";
import { ArtworkSiblingsNav } from "@/components/gallery/artwork-siblings-nav";
import { ArtworkStory } from "@/components/gallery/artwork-story";
import { DetailPlate } from "@/components/gallery/detail-plate";
import { EnquiryBar } from "@/components/gallery/enquiry-bar";
import { WallLabel } from "@/components/gallery/wall-label";
import { wallTone } from "@/components/gallery/wall-tone";
import { SectionCta } from "@/components/home/section-cta";
import { Testimonials } from "@/components/home/testimonials";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { Section, SectionHeader } from "@/components/ui/section";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import {
	getAllArtworkSlugs,
	getAllArtworks,
	getArtworkBySlug,
	getSite,
	getTestimonialsForArtwork,
} from "@/lib/data";
import { artworkImageUrl, artworkPreloadSrcset } from "@/lib/image-base";
import { cardRevealDelay, staggerDelay } from "@/lib/motion";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { formatInr } from "@/lib/utils";
import { buildWhatsAppLink, buyArtworkMessage, extractPhoneFromWaUrl } from "@/lib/whatsapp";
import "@/components/editorial/editorial.css";

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

/** Up to this many same-style pieces in the "More" strip under the spread. */
const RELATED_COUNT = 4;

/** Plate widths in the related masonry: two columns on phones, four from lg. */
const RELATED_SIZES = "(min-width: 1152px) 270px, (min-width: 1024px) 23vw, 45vw";

/**
 * Artwork detail page as an editorial spread. The top is a full-bleed wall
 * painted in the piece's own deepest pigment (wallTone over the band-pigment
 * remap, so every token flips to cream): the plate hangs on it with scroll
 * parallax and a float breath, and the details column (counter, kinetic
 * title, meta, price, the one full-width Enquire) sticks beside it from lg.
 * Below: the piece's story with facts and animated palette discs, any
 * collector quotes, then prev / next previews and more of the same style.
 * Phones keep art > label > price > Enquire in that order, with a sticky
 * enquiry bar while the panel is off screen.
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
	const related = all
		.filter((a) => a.style === art.style && a.slug !== art.slug)
		.slice(0, RELATED_COUNT);
	const indexBySlug = new Map(all.map((a, i) => [a.slug, i + 1]));

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

	const tone = wallTone(art.palette);
	const wallStyle = tone ? ({ "--section-accent": tone } as CSSProperties) : undefined;
	const styleHref = `/work?style=${encodeURIComponent(art.style)}`;

	return (
		<main>
			{/* VisualArtwork structured data for rich results. Escape "<" to
			    its unicode escape so an admin-entered title/dimension holding a
			    closing script tag can't break out of it (the fields are DB-editable). */}
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD, angle brackets escaped below
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(artworkJsonLd(art)).replaceAll("<", String.raw`\u003c`),
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

			<section
				aria-label={`${art.title}, on the wall`}
				style={wallStyle}
				className="band-pigment overflow-hidden [contain:paint]"
			>
				<Container className="relative pt-5 pb-12 sm:pt-6 lg:pb-16">
					<Reveal eager>
						<nav
							aria-label="Breadcrumb"
							className="flex flex-wrap items-center gap-x-3 text-xs uppercase tracking-meta text-muted"
						>
							<Link
								href="/work"
								className="inline-flex min-h-control items-center gap-2 transition-colors hover:text-ink"
							>
								<ArrowLeft size={14} aria-hidden="true" />
								Back to artwork
							</Link>
							<span aria-hidden="true">/</span>
							<Link
								href={styleHref}
								className="inline-flex min-h-control items-center transition-colors hover:text-ink"
							>
								{art.style}
							</Link>
						</nav>
					</Reveal>

					<div className="mt-4 grid gap-10 lg:mt-6 lg:grid-cols-12 lg:gap-14">
						{/* Image plate at the piece's own ratio, whole painting shown;
						    never inside a Reveal (LCP). */}
						<div className="min-w-0 lg:col-span-7">
							<DetailPlate
								artwork={art}
								siblings={all}
								alt={art.description ?? artworkAlt(art)}
								sizes={DETAIL_SIZES}
								maxWidth={DETAIL_MAX_WIDTH}
							/>
						</div>

						<div className="min-w-0 lg:sticky lg:top-[calc(var(--header-h-shrunk)+var(--space-page))] lg:col-span-5 lg:self-start">
							<WallLabel
								variant="full"
								mark
								stagger
								titleKinetic
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
								titleClassName="type-page mt-1"
								priceClassName="mt-3 text-h2 lining-nums"
							/>
							{/* Honest scarcity: every piece is a single physical original.
							    No timers, no fake stock. */}
							{isAvailable && !isSold ? (
								<Reveal eager delayMs={staggerDelay(5)}>
									<p className="t-meta mt-3 normal-case tracking-normal">
										One of a kind, the only original. Not a print.
									</p>
								</Reveal>
							) : null}

							<Reveal eager delayMs={staggerDelay(5) + 80}>
								<ArtworkCtaPanel
									art={art}
									whatsappLink={whatsappLink}
									cta={cta}
									isAvailable={isAvailable}
									isSold={isSold}
									whatsappDisplay={contact.whatsapp.display}
								/>
							</Reveal>
						</div>
					</div>
				</Container>
			</section>

			<ArtworkStory art={art} />

			{/* Testimonials tied to this piece (renders nothing when none). */}
			<Testimonials testimonials={testimonials} heading="What collectors say" />

			<Section accent="accent" background="canvas" padded borderTop>
				<ArtworkSiblingsNav prev={prev} next={next} />
				{related.length > 0 ? (
					<div className="mt-(--space-canyon)">
						<SectionHeader
							eyebrow="Keep looking"
							title={`More ${art.style}`}
							action={<SectionCta href={styleHref}>See every {art.style} piece</SectionCta>}
						/>
						<ul className="mt-8 columns-2 gap-3 sm:gap-6 lg:columns-4">
							{related.map((piece, i) => (
								<li key={piece.slug} className="mb-6 break-inside-avoid">
									<ArtworkCard
										variant="wall"
										artwork={piece}
										siblings={related}
										sizes={RELATED_SIZES}
										index={indexBySlug.get(piece.slug)}
										total={all.length}
										revealDelayMs={cardRevealDelay(i, RELATED_COUNT)}
									/>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</Section>

			{/* Phone-only sticky enquiry bar; hides while #enquire or the page end is on screen. */}
			<EnquiryBar price={priceSlot} href={whatsappLink} label={cta.label} watchId="enquire" />
		</main>
	);
}

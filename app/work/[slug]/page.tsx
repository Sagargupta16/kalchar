import { ArrowLeft, ArrowRight, ImageIcon, MessageCircle, Palette, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtImage } from "@/components/gallery/art-image";
import { Chromacard } from "@/components/gallery/chromacard";
import { ShareButton } from "@/components/gallery/share-button";
import { Testimonials } from "@/components/home/testimonials";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import {
	getAllArtworkSlugs,
	getAllArtworks,
	getArtworkBySlug,
	getSite,
	getTestimonialsForArtwork,
} from "@/lib/data";
import { artworkImageUrl, artworkPreloadSrcset } from "@/lib/image-base";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
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
 * Artwork detail page.
 *
 * Mobile flow: full-bleed image plate, then title + style, then metadata
 * stack, then description, then a sticky-feeling buy/enquire CTA. Desktop
 * splits left (image) / right (info) at md.
 *
 * Prev/next links derive from sort order so the visitor can sweep through
 * the archive without bouncing back to /work.
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

	const { contact } = getSite();
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: buyArtworkMessage(art),
	});

	const isAvailable = isPositivePrice(art.priceInr);
	const isSold = art.status === "sold";
	const cta = getCtaCopy(isAvailable, isSold);

	return (
		<main className="mx-auto max-w-6xl px-(--container-px) py-(--section-py)">
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
					className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-meta text-muted transition-colors hover:text-accent"
				>
					<ArrowLeft size={14} aria-hidden="true" />
					Back to artwork
				</Link>
			</Reveal>

			<div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12">
				{/* Image plate */}
				<Reveal eager className="md:col-span-7">
					<div className="relative aspect-3/4 overflow-hidden rounded-(--radius-lg) bg-bg-soft shadow-hairline">
						<ArtImage
							src={`/artworks/${art.image}`}
							alt={art.description ?? artworkAlt(art)}
							sizes={DETAIL_SIZES}
							maxWidth={DETAIL_MAX_WIDTH}
							priority
							className="absolute inset-0 h-full w-full object-cover"
						/>
						{isAvailable && !isSold ? (
							<span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-bg/90 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-meta text-ink shadow-e1 backdrop-blur">
								Available
							</span>
						) : null}
						{isSold ? (
							<span className="pointer-events-none absolute -left-9 top-4 z-10 w-32 -rotate-45 bg-ruby py-1 text-center text-[0.6rem] font-semibold uppercase tracking-meta text-bg shadow-e1 sm:-left-10 sm:top-5 sm:w-36 sm:text-[0.7rem]">
								Sold
							</span>
						) : null}
					</div>
				</Reveal>

				{/* Info column */}
				<div className="md:col-span-5">
					<Reveal eager>
						<p className="t-eyebrow">{art.style}</p>
					</Reveal>
					<Reveal eager delayMs={80} as="h1" className="t-display mt-3 text-4xl sm:text-5xl">
						{art.title}
					</Reveal>

					{art.description ? (
						<Reveal delayMs={140}>
							<p className="t-lead mt-5">{art.description}</p>
						</Reveal>
					) : null}

					<Reveal delayMs={200}>
						<dl className="mt-8 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
							<dt className="t-meta normal-case tracking-normal">
								<span className="inline-flex items-center gap-1.5">
									<ImageIcon size={13} aria-hidden="true" /> Medium
								</span>
							</dt>
							<dd>{art.medium}</dd>
							{art.year ? (
								<>
									<dt className="t-meta normal-case tracking-normal">Year</dt>
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
						<Reveal delayMs={240}>
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

					<Reveal delayMs={260}>
						<div className="mt-10 rounded-(--radius-md) border border-line bg-bg-soft p-5 sm:p-6">
							{typeof art.priceInr === "number" ? (
								<div className="mb-4 flex items-baseline justify-between gap-3">
									<span className="t-meta normal-case tracking-normal text-muted">Price</span>
									<span className="t-display text-2xl tabular-nums text-(--section-accent) sm:text-3xl">
										{formatInr(art.priceInr)}
									</span>
								</div>
							) : null}
							{/* Honest scarcity: every piece is a single physical original, so
							    say so plainly on an available piece. No timers, no fake stock. */}
							{isAvailable && !isSold ? (
								<p className="mb-4 text-xs text-muted">
									One of a kind, the only original. Not a print.
								</p>
							) : null}
							<a
								href={whatsappLink}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
							>
								<MessageCircle size={16} aria-hidden="true" />
								{cta.label}
							</a>
							<p className="mt-3 text-xs text-muted">{cta.note}</p>
							<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
								<ShareButton title={art.title} url={`${siteConfig.url}/work/${art.slug}/`} />
								<Link
									href={`/work?style=${encodeURIComponent(art.style)}`}
									className="inline-flex min-h-11 items-center gap-1.5 rounded-(--radius-md) border border-line px-3 py-2 text-xs uppercase tracking-meta text-muted transition-colors duration-(--duration-fast) ease-(--ease-out) hover:border-accent hover:text-accent"
								>
									See more {art.style}
									<ArrowRight size={13} aria-hidden="true" />
								</Link>
							</div>
						</div>
					</Reveal>
				</div>
			</div>

			{/* Testimonials tied to this piece (renders nothing when none). The
			    component brings its own max-width + padding, so drop it full-bleed
			    here rather than nesting it in the detail grid. */}
			{testimonials.length > 0 ? (
				<div className="-mx-(--container-px)">
					<Testimonials testimonials={testimonials} heading="What collectors say" />
				</div>
			) : null}

			{/* Prev / next */}
			{(prev || next) && (
				<nav
					aria-label="Browse other works"
					className="mt-20 grid gap-6 border-t border-line pt-8 sm:grid-cols-2"
				>
					{prev ? (
						<Link
							href={`/work/${prev.slug}`}
							className="group flex items-center gap-3 text-left transition-colors hover:text-accent"
						>
							<ArrowLeft
								size={16}
								aria-hidden="true"
								className="text-muted transition-colors group-hover:text-accent"
							/>
							<span>
								<span className="t-meta block">Previous</span>
								<span className="t-display text-lg">{prev.title}</span>
							</span>
						</Link>
					) : (
						<span aria-hidden="true" />
					)}
					{next ? (
						<Link
							href={`/work/${next.slug}`}
							className="group flex items-center justify-end gap-3 text-right transition-colors hover:text-accent"
						>
							<span>
								<span className="t-meta block">Next</span>
								<span className="t-display text-lg">{next.title}</span>
							</span>
							<ArrowRight
								size={16}
								aria-hidden="true"
								className="text-muted transition-colors group-hover:text-accent"
							/>
						</Link>
					) : (
						<span aria-hidden="true" />
					)}
				</nav>
			)}
		</main>
	);
}

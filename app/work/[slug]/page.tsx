import { ArrowLeft, ArrowRight, ImageIcon, MessageCircle, Palette, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtImage } from "@/components/gallery/art-image";
import { Chromacard } from "@/components/gallery/chromacard";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { getAllArtworkSlugs, getAllArtworks, getArtworkBySlug, getSite } from "@/lib/data";
import { ARTWORK_IMAGE_BASE, artworkPreloadSrcset } from "@/lib/image-base";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, buyArtworkMessage, extractPhoneFromWaUrl } from "@/lib/whatsapp";

/** sizes hint shared by the detail <img> and its preload link -- must match. */
const DETAIL_SIZES = "(min-width: 768px) 60vw, 100vw";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
	return (await getAllArtworkSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const art = await getArtworkBySlug(slug);
	if (!art) return { title: "Artwork not found" };
	return {
		title: art.title,
		description: art.description ?? `${art.title}, ${art.style} painting in ${art.medium}.`,
		openGraph: {
			images: [{ url: `${ARTWORK_IMAGE_BASE}/${art.slug}-1200.webp`, width: 1200 }],
		},
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

/** CTA label + supporting note, derived from the piece's availability state. */
function getCtaCopy(isAvailable: boolean, isSold: boolean): { label: string; note: string } {
	if (isSold) {
		return {
			label: "Ask about a similar piece",
			note: "This piece has found a home. Reach out for a commission in the same style.",
		};
	}
	if (isAvailable) {
		return {
			label: "Enquire on WhatsApp",
			note: "Tap to open a pre-filled WhatsApp message. Ships from India.",
		};
	}
	return {
		label: "Ask about this piece",
		note: "Listed in the archive. Reach out if you'd like a similar piece commissioned.",
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

	const all = await getAllArtworks();
	const { prev, next } = getSiblings(all, art.slug);

	const { contact } = getSite();
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: buyArtworkMessage(art),
	});

	const isAvailable = typeof art.priceInr === "number";
	const isSold = art.status === "sold";
	const cta = getCtaCopy(isAvailable, isSold);

	return (
		<main className="mx-auto max-w-6xl px-(--container-px) py-(--section-py)">
			{/* Preload the artwork plate (the LCP element) so its fetch starts at
			    HTML parse. imageSrcSet/imageSizes mirror the <img> exactly. */}
			<link
				rel="preload"
				as="image"
				type="image/avif"
				imageSrcSet={artworkPreloadSrcset(art.image, 800)}
				imageSizes={DETAIL_SIZES}
				fetchPriority="high"
			/>
			<Reveal eager>
				<Link
					href="/work"
					className="inline-flex items-center gap-2 text-xs uppercase tracking-meta text-muted transition-colors hover:text-accent"
				>
					<ArrowLeft size={14} aria-hidden="true" />
					Back to work
				</Link>
			</Reveal>

			<div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12">
				{/* Image plate */}
				<Reveal eager className="md:col-span-7">
					<div className="relative aspect-3/4 overflow-hidden rounded-(--radius-card) bg-bg-soft ring-1 ring-black/10 dark:ring-white/10">
						<ArtImage
							src={`/artworks/${art.image}`}
							alt={art.description ?? `${art.title}, ${art.style} painting in ${art.medium}.`}
							sizes={DETAIL_SIZES}
							maxWidth={800}
							priority
							className="absolute inset-0 h-full w-full object-cover"
						/>
						{isAvailable && !isSold ? (
							<span className="absolute left-3.5 top-3.5 z-10 rounded-full bg-bg/90 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-meta text-ink shadow-sm backdrop-blur">
								Available
							</span>
						) : null}
						{isSold ? (
							<span className="pointer-events-none absolute -left-9 top-4 z-10 w-32 -rotate-45 bg-ruby py-1 text-center text-[0.6rem] font-semibold uppercase tracking-meta text-bg shadow-sm sm:-left-10 sm:top-5 sm:w-36 sm:text-[0.7rem]">
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
						<div className="mt-10 rounded-(--radius-card) border border-line bg-bg-soft p-5 sm:p-6">
							{isAvailable ? (
								<div className="mb-4 flex items-baseline justify-between gap-3">
									<span className="t-meta normal-case tracking-normal text-muted">Price</span>
									<span className="t-display text-2xl tabular-nums text-(--section-accent) sm:text-3xl">
										INR {art.priceInr?.toLocaleString("en-IN")}
									</span>
								</div>
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
						</div>
					</Reveal>
				</div>
			</div>

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

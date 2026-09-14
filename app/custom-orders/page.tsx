import { Brush, Clock, MessageCircle } from "lucide-react";
import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import {
	getAllArtworks,
	getCategoryNames,
	getOrderPresets,
	getSite,
	getStyleSamples,
} from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { toRoman } from "@/lib/utils";
import { extractPhoneFromWaUrl } from "@/lib/whatsapp";

export const metadata = createPageMetadata({
	title: "Custom orders",
	description:
		"Order a custom painting in Madhubani, Pichwai, Lippan, Gond, Texture, or Mixed Media. Send a brief and we'll get back to you on WhatsApp.",
	path: "/custom-orders/",
});

interface CustomOrdersSection {
	eyebrow?: string;
	title?: string;
	lead?: string;
	sizes?: readonly string[];
	budgets?: readonly string[];
	timelines?: readonly string[];
	submitLabel?: string;
	fallbackEmailLabel?: string;
}

export default async function CustomOrdersPage() {
	const { contact, sections } = getSite();
	const customOrders = (sections.customOrders ?? {}) as CustomOrdersSection;
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);
	const [presets, styleSamples, allArtworks, styles] = await Promise.all([
		getOrderPresets(),
		getStyleSamples(),
		getAllArtworks(),
		getCategoryNames(),
	]);

	// A few finished pieces to show what a commission can look like. Prefer
	// featured pieces; fall back to the first few in the catalog.
	const EXAMPLE_PIECE_COUNT = 4;
	const MIN_FEATURED_EXAMPLES = 3;
	const featuredExamples = allArtworks.filter((art) => art.featured).slice(0, EXAMPLE_PIECE_COUNT);
	const examplePieces =
		featuredExamples.length >= MIN_FEATURED_EXAMPLES
			? featuredExamples
			: allArtworks.slice(0, EXAMPLE_PIECE_COUNT);

	return (
		<main>
			{/* The standard public page header (visual-direction 2.0): grand rhythm
			    on the flat vermillion wash band with the short kachni rule. */}
			<Section accent="vermillion" background="wash" rhythm="grand" padded>
				<PageHeader
					kachni
					eyebrow={customOrders.eyebrow ?? "Custom orders"}
					title={customOrders.title ?? "Order a custom painting"}
					lead={customOrders.lead}
				/>
			</Section>

			<Section accent="vermillion" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-12 md:grid-cols-12 md:gap-14">
					{/* How it works. On phones the form (the job) renders first and the
					    steps follow it; from md the aside sits beside the taller form and
					    sticks below the shrunk header. DOM order stays aside-first so a
					    screen reader still hears the process before the fields. */}
					<aside className="order-last min-w-0 md:order-none md:col-span-4">
						<div className="md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))]">
							<Reveal>
								<p className="t-eyebrow flex items-center gap-2">
									<AccentRule />
									How it works
								</p>
								<h2 className="t-headline mt-2 text-title">Three steps, one conversation</h2>
							</Reveal>
							<ol className="mt-6 flex flex-col gap-6">
								<Reveal as="li" delayMs={staggerDelay(1)}>
									<StepItem
										step={1}
										icon={<Brush className="size-3.5" />}
										title="Send a brief"
										body="Style, size, occasion. References welcome on WhatsApp once we connect."
									/>
								</Reveal>
								<Reveal as="li" delayMs={staggerDelay(2)}>
									<StepItem
										step={2}
										icon={<MessageCircle className="size-3.5" />}
										title="We talk it through"
										body="We get back on WhatsApp, ask for missing details, and share a quote + timeline."
									/>
								</Reveal>
								<Reveal as="li" delayMs={staggerDelay(3)}>
									<StepItem
										step={3}
										icon={<Clock className="size-3.5" />}
										title="Painted, approved, shipped"
										body="Progress shots along the way. Ships from India after your sign-off."
									/>
								</Reveal>
							</ol>
							{/* Reassurance under a gold rule -- no commitment until you've talked. */}
							<Reveal delayMs={staggerDelay(4)}>
								<p
									data-slot="reassurance"
									className="mt-8 border-t border-(--color-gold-hairline) pt-6 text-sm text-muted"
								>
									No payment until we&rsquo;ve agreed on the piece, a price, and a timeline. Sending
									a brief is just the start of a conversation.
								</p>
							</Reveal>
						</div>
					</aside>

					{/* Form: the commission sheet owns its card surface. */}
					<section aria-label="Custom order form" className="min-w-0 md:col-span-8">
						<h2 className="sr-only">Order details</h2>
						<Reveal eager delayMs={staggerDelay(1)}>
							<CustomOrderForm
								phoneE164NoPlus={phone}
								emailUrl={contact.email.url}
								availableStyles={styles}
								styleSamples={styleSamples}
								sizes={presets.sizes}
								budgets={presets.budgets}
								timelines={presets.timelines}
								submitLabel={customOrders.submitLabel ?? "Send on WhatsApp"}
								fallbackEmailLabel={customOrders.fallbackEmailLabel ?? "Or email instead"}
							/>
						</Reveal>
					</section>
				</div>

				{/* Examples -- finished pieces, to spark ideas and build confidence.
				    The canyon seam (--space-canyon) separates the strip from the sheet
				    (visual-direction 2.8): >= 64px at 390, >= 96px at 1280. */}
				{examplePieces.length > 0 ? (
					<div data-slot="example-strip" className="mt-(--space-canyon)">
						<Reveal>
							<p className="t-eyebrow flex items-center gap-2">
								<AccentRule />
								For inspiration
							</p>
							<h2 className="t-headline mt-2 text-title">A few pieces from the studio</h2>
						</Reveal>
						<GalleryGrid cols={4} className="mt-8">
							{examplePieces.map((art, i) => (
								<Reveal key={art.slug} as="li" delayMs={staggerDelay(i)}>
									<ArtworkCard artwork={art} siblings={examplePieces} priority={i < 2} />
								</Reveal>
							))}
						</GalleryGrid>
					</div>
				) : null}
			</Section>
		</main>
	);
}

/**
 * One commission step as wall text (visual-direction 2.8): the numeral voice
 * carries the roman count in the vermillion section pigment; the icon stays
 * in-cell at size-3.5, nothing removed.
 */
function StepItem({
	step,
	icon,
	title,
	body,
}: Readonly<{ step: number; icon: React.ReactNode; title: string; body: string }>) {
	return (
		<div className="flex gap-4">
			<span
				aria-hidden="true"
				className="t-numeral w-10 shrink-0 pt-1 text-title text-(--section-accent)"
			>
				{toRoman(step)}
			</span>
			<div className="min-w-0">
				<h3 className="t-display flex items-center gap-2 text-h3">
					{title}
					<span className="text-muted">{icon}</span>
				</h3>
				<p className="mt-1 text-sm text-muted">{body}</p>
			</div>
		</div>
	);
}

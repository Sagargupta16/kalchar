import { ArrowDown, ArrowRight, Brush, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import {
	getAllArtworks,
	getCategoryNames,
	getOrderPresets,
	getSite,
	getStyleSamples,
} from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, toRoman } from "@/lib/utils";
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

const STEPS = [
	{
		icon: <Brush className="size-4" />,
		title: "Send a brief",
		body: "Style, size, occasion. References welcome on WhatsApp once we connect.",
	},
	{
		icon: <MessageCircle className="size-4" />,
		title: "We talk it through",
		body: "We get back on WhatsApp, talk through the details, and share a price and timeline.",
	},
	{
		icon: <Clock className="size-4" />,
		title: "Painted, approved, shipped",
		body: "Progress shots along the way. Ships from India after your sign-off.",
	},
] as const;

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
			<PageHero
				accent="vermillion"
				glyph="रंग"
				eyebrow={customOrders.eyebrow ?? "Custom orders"}
				title={customOrders.title ?? "Order a custom painting"}
				lead={customOrders.lead}
				aside={
					<Reveal eager delayMs={staggerDelay(4)} className="hidden lg:block">
						<ol className="grid gap-px overflow-hidden rounded-(--radius-md) border border-line bg-line">
							{STEPS.map((step, i) => (
								<li key={step.title} className="flex gap-4 bg-canvas p-5">
									<span aria-hidden="true" className="t-numeral text-title text-(--section-accent)">
										{toRoman(i + 1)}
									</span>
									<span className="min-w-0">
										<span className="block text-base font-medium text-ink">{step.title}</span>
										<span className="mt-0.5 block text-sm text-muted">{step.body}</span>
									</span>
								</li>
							))}
						</ol>
					</Reveal>
				}
			>
				<Reveal eager delayMs={staggerDelay(5)}>
					<div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
						<a
							href="#commission-brief"
							className={buttonVariants({ variant: "primary", size: "lg" })}
						>
							Start your brief
							<ArrowDown size={16} aria-hidden="true" />
						</a>
						<a
							href="#how-it-works"
							className={buttonVariants({ variant: "secondary", size: "lg" })}
						>
							How it works
						</a>
					</div>
					<p className="mt-5 text-sm text-muted">
						No payment until we have agreed on the piece, a price and a timeline.
					</p>
				</Reveal>
			</PageHero>

			<Section accent="vermillion" padded containerClassName="pt-(--space-canyon)">
				{/* Form: the commission sheet owns its card surface. */}
				<section
					id="commission-brief"
					aria-label="Custom order form"
					className="min-w-0 scroll-mt-(--space-page)"
				>
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

				{/* How it works: three steps as wall text with roman numerals in the
				    vermillion pigment, closed by the reassurance under a gold rule. */}
				<aside id="how-it-works" className="mt-(--space-canyon) scroll-mt-(--space-page)">
					<SectionHeader eyebrow="How it works" title="Three steps, one conversation" />
					<ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
						{STEPS.map((step, i) => (
							<Reveal key={step.title} as="li" delayMs={staggerDelay(i)}>
								<StepItem step={i + 1} icon={step.icon} title={step.title} body={step.body} />
							</Reveal>
						))}
					</ol>
					<Reveal delayMs={staggerDelay(3)}>
						<div
							data-slot="reassurance"
							className="mt-10 flex flex-col gap-2 border-t border-(--color-gold-hairline) pt-6 sm:flex-row sm:items-center sm:justify-between"
						>
							<p className="max-w-2xl text-sm text-muted">
								No payment until we&rsquo;ve agreed on the piece, a price, and a timeline. Sending a
								brief is just the start of a conversation.
							</p>
							<Link
								href="/trust"
								className={cn(
									buttonVariants({ variant: "link" }),
									"min-h-control shrink-0 whitespace-normal",
								)}
							>
								Questions about payment or delivery?
								<ArrowRight size={14} aria-hidden="true" />
							</Link>
						</div>
					</Reveal>
				</aside>

				{/* Examples: finished pieces, to spark ideas and build confidence. */}
				{examplePieces.length > 0 ? (
					<div data-slot="example-strip" className="mt-(--space-canyon)">
						<SectionHeader
							eyebrow="For inspiration"
							title="A few pieces from the studio"
							action={
								<Link href="/work" className={cn(buttonVariants({ variant: "ghost" }), "group")}>
									See all artwork
									<ArrowRight size={14} aria-hidden="true" />
								</Link>
							}
						/>
						{/* Same edge-to-edge, natural-ratio masonry as the home strips. */}
						<ul className="mt-8 columns-2 gap-3 sm:gap-6 lg:columns-4">
							{examplePieces.map((art, i) => (
								<li key={art.slug} className="mb-6 min-w-0 break-inside-avoid sm:mb-8">
									<ArtworkCard
										variant="wall"
										artwork={art}
										siblings={examplePieces}
										priority={i < 2}
									/>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</Section>
		</main>
	);
}

/**
 * One commission step as wall text: a big roman numeral in the vermillion
 * section pigment, the title with its small glyph, and one line of body.
 */
function StepItem({
	step,
	icon,
	title,
	body,
}: Readonly<{ step: number; icon: React.ReactNode; title: string; body: string }>) {
	return (
		<div className="flex gap-4 md:flex-col md:gap-3">
			<span
				aria-hidden="true"
				className="t-numeral type-page w-14 shrink-0 text-(--section-accent) md:w-auto"
			>
				{toRoman(step)}
			</span>
			<div className="min-w-0 border-l border-line pl-4 md:border-t md:border-l-0 md:pt-4 md:pl-0">
				<h3 className="t-headline flex items-center gap-2 text-h3">
					{title}
					<span className="text-muted" aria-hidden="true">
						{icon}
					</span>
				</h3>
				<p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
			</div>
		</div>
	);
}

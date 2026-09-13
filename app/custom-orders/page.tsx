import { Brush, Clock, MessageCircle } from "lucide-react";
import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { Card } from "@/components/ui/card";
import { IconCircle } from "@/components/ui/icon-circle";
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
		<main className="[--shadow-ink:0.2_0.025_35]">
			<Section accent="vermillion" padded>
				<PageHeader
					eyebrow={customOrders.eyebrow ?? "Custom orders"}
					title={customOrders.title ?? "Order a custom painting"}
					lead={customOrders.lead}
				/>

				<div className="mt-(--space-block) grid gap-12 md:grid-cols-12 md:gap-14">
					{/* How it works. On phones the form (the job) renders first and the
					    steps follow it; from md the aside sits beside the taller form and
					    sticks below the shrunk header. DOM order stays aside-first so a
					    screen reader still hears the process before the fields. */}
					<aside className="order-last min-w-0 md:order-none md:col-span-5">
						<div className="md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))]">
							<Reveal>
								<p className="t-eyebrow flex items-center gap-2">
									<AccentRule />
									How it works
								</p>
								<h2 className="t-display mt-2 text-title">Three steps, one conversation</h2>
							</Reveal>
							<ol className="mt-6 flex flex-col gap-6">
								<Reveal as="li" delayMs={staggerDelay(1)}>
									<StepItem
										icon={<Brush size={14} />}
										title="Send a brief"
										body="Style, size, occasion. References welcome on WhatsApp once we connect."
									/>
								</Reveal>
								<Reveal as="li" delayMs={staggerDelay(2)}>
									<StepItem
										icon={<MessageCircle size={14} />}
										title="We talk it through"
										body="We get back on WhatsApp, ask for missing details, and share a quote + timeline."
									/>
								</Reveal>
								<Reveal as="li" delayMs={staggerDelay(3)}>
									<StepItem
										icon={<Clock size={14} />}
										title="Painted, approved, shipped"
										body="Progress shots along the way. Ships from India after your sign-off."
									/>
								</Reveal>
							</ol>
							{/* Reassurance -- no commitment until you've talked. */}
							<Reveal delayMs={staggerDelay(4)}>
								<p className="mt-8 border-t border-line pt-6 text-sm text-muted">
									No payment until we&rsquo;ve agreed on the piece, a price, and a timeline. Sending
									a brief is just the start of a conversation.
								</p>
							</Reveal>
						</div>
					</aside>

					{/* Form */}
					<section aria-label="Custom order form" className="min-w-0 md:col-span-7">
						<h2 className="sr-only">Order details</h2>
						<Reveal delayMs={staggerDelay(1)}>
							<Card padding="lg">
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
							</Card>
						</Reveal>
					</section>
				</div>

				{/* Examples -- finished pieces, to spark ideas and build confidence. */}
				{examplePieces.length > 0 ? (
					<div className="mt-(--space-block) border-t border-line pt-(--space-block)">
						<Reveal>
							<p className="t-eyebrow flex items-center gap-2">
								<AccentRule />
								For inspiration
							</p>
							<h2 className="t-display mt-2 text-title">A few pieces from the studio</h2>
						</Reveal>
						<ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
							{examplePieces.map((art, i) => (
								<Reveal key={art.slug} as="li" delayMs={staggerDelay(i)}>
									<ArtworkCard artwork={art} siblings={examplePieces} priority={i < 2} />
								</Reveal>
							))}
						</ul>
					</div>
				) : null}
			</Section>
		</main>
	);
}

function StepItem({
	icon,
	title,
	body,
}: Readonly<{ icon: React.ReactNode; title: string; body: string }>) {
	return (
		<div className="flex gap-4">
			<IconCircle size="sm">{icon}</IconCircle>
			<div className="min-w-0">
				{/* The title box is the circle's height so its first line centres on the icon. */}
				<h3 className="t-display flex min-h-9 items-center text-h3">{title}</h3>
				<p className="mt-1 text-sm text-muted">{body}</p>
			</div>
		</div>
	);
}

import { Brush, Clock, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
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
import { extractPhoneFromWaUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
	title: "Custom orders",
	description:
		"Order a custom painting in Madhubani, Pichwai, Lippan, Gond, Texture, or Mixed Media. Send a brief and we'll get back to you on WhatsApp.",
};

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
			<Section accent="vermillion">
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow={customOrders.eyebrow ?? "Custom orders"}
						title={customOrders.title ?? "Order a custom painting"}
						lead={customOrders.lead}
					/>

					<div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-14">
						{/* How it works -- sticky on desktop so it stays beside the
						    taller form as the visitor scrolls/fills it in. */}
						<aside className="min-w-0 md:col-span-5">
							<div className="md:sticky md:top-24">
								<Reveal>
									<h2 className="t-eyebrow">How it works</h2>
								</Reveal>
								<ol className="mt-6 space-y-5">
									<Reveal as="li" delayMs={60}>
										<StepItem
											icon={<Brush size={16} />}
											title="Send a brief"
											body="Style, size, occasion. References welcome on WhatsApp once we connect."
										/>
									</Reveal>
									<Reveal as="li" delayMs={120}>
										<StepItem
											icon={<MessageCircle size={16} />}
											title="We talk it through"
											body="We get back on WhatsApp, ask for missing details, and share a quote + timeline."
										/>
									</Reveal>
									<Reveal as="li" delayMs={180}>
										<StepItem
											icon={<Clock size={16} />}
											title="Painted, approved, shipped"
											body="Progress shots along the way. Ships from India after your sign-off."
										/>
									</Reveal>
								</ol>
								{/* Reassurance -- no commitment until you've talked. */}
								<Reveal delayMs={240}>
									<p className="mt-8 border-t border-line pt-6 text-sm text-muted">
										No payment until we&rsquo;ve agreed on the piece, a price, and a timeline.
										Sending a brief is just the start of a conversation.
									</p>
								</Reveal>
							</div>
						</aside>

						{/* Form */}
						<section aria-label="Custom order form" className="min-w-0 md:col-span-7">
							<h2 className="sr-only">Order details</h2>
							<Reveal delayMs={120}>
								<Card padding="lg">
									<CustomOrderForm
										phoneE164NoPlus={phone}
										emailUrl={contact.email.url}
										availableStyles={styles}
										styleSamples={styleSamples}
										sizes={presets.sizes}
										budgets={presets.budgets}
										timelines={presets.timelines}
										submitLabel={customOrders.submitLabel ?? "Send via WhatsApp"}
										fallbackEmailLabel={customOrders.fallbackEmailLabel ?? "Or email instead"}
									/>
								</Card>
							</Reveal>
						</section>
					</div>

					{/* Examples -- finished pieces, to spark ideas and build confidence. */}
					{examplePieces.length > 0 ? (
						<div className="mt-20 border-t border-line pt-14">
							<Reveal>
								<div className="flex items-baseline justify-between gap-4">
									<div>
										<p className="t-eyebrow flex items-center gap-2">
											<span
												aria-hidden="true"
												className="inline-block h-px w-5 bg-(--section-accent)"
											/>
											For inspiration
										</p>
										<h2 className="t-display mt-2 text-2xl sm:text-3xl">
											A few pieces from the studio
										</h2>
									</div>
								</div>
							</Reveal>
							<ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
								{examplePieces.map((art, i) => (
									<Reveal key={art.slug} as="li" delayMs={i * 60}>
										<ArtworkCard artwork={art} siblings={examplePieces} priority={i < 2} />
									</Reveal>
								))}
							</ul>
						</div>
					) : null}
				</Container>
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
			<div>
				<h3 className="t-display text-lg">{title}</h3>
				<p className="mt-1 text-sm text-muted">{body}</p>
			</div>
		</div>
	);
}

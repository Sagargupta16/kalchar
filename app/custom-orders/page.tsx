import { Brush, Clock, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { CustomOrderForm } from "@/components/forms/custom-order-form";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
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

export default function CustomOrdersPage() {
	const { contact, sections, styles } = getSite();
	const co = (sections.customOrders ?? {}) as CustomOrdersSection;
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);

	return (
		<main>
			<Section accent="vermillion">
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow={co.eyebrow ?? "Custom orders"}
						title={co.title ?? "Order a custom painting"}
						lead={co.lead}
					/>

					<div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-14">
						{/* How it works */}
						<aside className="md:col-span-5">
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
						</aside>

						{/* Form */}
						<section aria-label="Custom order form" className="md:col-span-7">
							<h2 className="sr-only">Order details</h2>
							<Reveal delayMs={120}>
								<Card padding="lg">
									<CustomOrderForm
										phoneE164NoPlus={phone}
										emailUrl={contact.email.url}
										availableStyles={styles}
										sizes={co.sizes ?? []}
										budgets={co.budgets ?? []}
										timelines={co.timelines ?? []}
										submitLabel={co.submitLabel ?? "Send via WhatsApp"}
										fallbackEmailLabel={co.fallbackEmailLabel ?? "Or email instead"}
									/>
								</Card>
							</Reveal>
						</section>
					</div>
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

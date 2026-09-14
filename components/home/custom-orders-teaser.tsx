import { Brush, Clock, MessageCircle } from "lucide-react";
import { KachniRule } from "@/components/decor/kachni-rule";
import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface CustomOrdersTeaserProps {
	phone: string;
	eyebrow: string;
	title: string;
	lead?: string;
}

export function CustomOrdersTeaser({
	phone,
	eyebrow,
	title,
	lead,
}: Readonly<CustomOrdersTeaserProps>) {
	const quickWa = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: "Hi, I'd like to discuss a custom piece.",
	});

	return (
		<Section id="custom-orders" accent="vermillion" background="wash" padded rhythm="grand">
			<KachniRule form="long" className="mb-(--space-block)" />
			<Spread
				header={
					<Reveal>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
					</Reveal>
				}
			>
				<ol className="grid gap-(--grid-gap) sm:grid-cols-3">
					<Reveal as="li" delayMs={staggerDelay(0)}>
						<StepCard
							step={1}
							icon={<Brush size={14} aria-hidden="true" />}
							title="Send a brief"
							body="Style, size, occasion. References welcome on WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={staggerDelay(1)}>
						<StepCard
							step={2}
							icon={<MessageCircle size={14} aria-hidden="true" />}
							title="We talk it through"
							body="Quote and timeline come back over WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={staggerDelay(2)}>
						<StepCard
							step={3}
							icon={<Clock size={14} aria-hidden="true" />}
							title="Painted, approved, shipped"
							body="Progress shots along the way. Ships from India."
						/>
					</Reveal>
				</ol>

				<Reveal delayMs={staggerDelay(3)}>
					<div className="mt-(--space-block) flex flex-wrap items-center gap-3">
						<a
							href={quickWa}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({ variant: "primary" })}
						>
							Start on WhatsApp
						</a>
						<SectionCta href="/custom-orders">Open the brief form</SectionCta>
					</div>
				</Reveal>
			</Spread>
		</Section>
	);
}

/**
 * One commission step: the numeral voice carries the "01 02 03" count in the
 * vermillion section pigment (visual-direction 2.1 change 6); the icon stays
 * inside the cell at size-3.5, nothing removed.
 */
function StepCard({
	step,
	icon,
	title,
	body,
}: Readonly<{ step: number; icon: React.ReactNode; title: string; body: string }>) {
	return (
		<Card className="flex h-full flex-col">
			<div className="flex items-center gap-2">
				<span className="t-numeral text-title text-(--section-accent)">0{step}</span>
				<span className="text-muted">{icon}</span>
			</div>
			<h3 className="t-display mt-4 text-h3">{title}</h3>
			<p className="mt-2 text-sm text-muted">{body}</p>
		</Card>
	);
}

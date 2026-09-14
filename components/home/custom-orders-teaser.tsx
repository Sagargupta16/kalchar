import { Brush, Clock, MessageCircle } from "lucide-react";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconCircle } from "@/components/ui/icon-circle";
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
		<Section id="custom-orders" accent="vermillion" background="canvas" padded borderBottom>
			<Reveal>
				<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
			</Reveal>

			<ol className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-3">
				<Reveal as="li" delayMs={staggerDelay(0)}>
					<StepCard
						step={1}
						icon={<Brush size={16} />}
						title="Send a brief"
						body="Style, size, occasion. References welcome on WhatsApp."
					/>
				</Reveal>
				<Reveal as="li" delayMs={staggerDelay(1)}>
					<StepCard
						step={2}
						icon={<MessageCircle size={16} />}
						title="We talk it through"
						body="Quote and timeline come back over WhatsApp."
					/>
				</Reveal>
				<Reveal as="li" delayMs={staggerDelay(2)}>
					<StepCard
						step={3}
						icon={<Clock size={16} />}
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
		</Section>
	);
}

function StepCard({
	step,
	icon,
	title,
	body,
}: Readonly<{ step: number; icon: React.ReactNode; title: string; body: string }>) {
	return (
		<Card className="flex h-full flex-col">
			<div className="flex items-center gap-3">
				<IconCircle>{icon}</IconCircle>
				<span className="t-meta text-(--section-accent)">0{step}</span>
			</div>
			<h3 className="t-display mt-4 text-h3">{title}</h3>
			<p className="mt-2 text-sm text-muted">{body}</p>
		</Card>
	);
}

import { ArrowRight, Brush, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";
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
		<Section accent="vermillion" background="soft" borderBottom>
			<Container className="py-(--section-py)">
				<header className="max-w-2xl">
					<Reveal>
						<p className="t-eyebrow flex items-center gap-2">
							<span aria-hidden="true" className="inline-block h-px w-5 bg-(--section-accent)" />
							{eyebrow}
						</p>
					</Reveal>
					<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl">
						{title}
					</Reveal>
					{lead ? (
						<Reveal delayMs={140}>
							<p className="t-lead mt-4">{lead}</p>
						</Reveal>
					) : null}
				</header>

				<ol className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-3">
					<Reveal as="li" delayMs={60}>
						<StepCard
							icon={<Brush size={18} />}
							title="Send a brief"
							body="Style, size, occasion. References welcome on WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={120}>
						<StepCard
							icon={<MessageCircle size={18} />}
							title="We talk it through"
							body="Quote and timeline come back over WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={180}>
						<StepCard
							icon={<Clock size={18} />}
							title="Painted, approved, shipped"
							body="Progress shots along the way. Ships from India."
						/>
					</Reveal>
				</ol>

				<Reveal delayMs={240}>
					<div className="mt-10 flex flex-wrap items-center gap-3 sm:mt-14">
						<a
							href={quickWa}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({ variant: "primary" })}
						>
							Start on WhatsApp
						</a>
						<Link
							href="/custom-orders"
							className={cn(buttonVariants({ variant: "secondary" }), "group")}
						>
							Open the brief form
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</Link>
					</div>
				</Reveal>
			</Container>
		</Section>
	);
}

function StepCard({
	icon,
	title,
	body,
}: Readonly<{ icon: React.ReactNode; title: string; body: string }>) {
	return (
		<Card className="flex h-full flex-col">
			<IconCircle>{icon}</IconCircle>
			<h3 className="t-display mt-4 text-xl">{title}</h3>
			<p className="mt-2 text-sm text-muted">{body}</p>
		</Card>
	);
}

import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
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
			<Spread
				header={
					<Reveal>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
						<div className="mt-6 flex flex-wrap items-center gap-3">
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
				}
			>
				<ol className="grid gap-6">
					<Reveal as="li" delayMs={staggerDelay(0)}>
						<ProcessStep
							step={1}
							title="Send a brief"
							body="Style, size, occasion. References welcome on WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={staggerDelay(1)}>
						<ProcessStep
							step={2}
							title="We talk it through"
							body="Quote and timeline come back over WhatsApp."
						/>
					</Reveal>
					<Reveal as="li" delayMs={staggerDelay(2)}>
						<ProcessStep
							step={3}
							title="Painted, approved, shipped"
							body="Progress shots along the way. Ships from India."
						/>
					</Reveal>
				</ol>
			</Spread>
		</Section>
	);
}

/** Compact numbered steps keep the commission process easy to scan on a phone. */
function ProcessStep({
	step,
	title,
	body,
}: Readonly<{ step: number; title: string; body: string }>) {
	return (
		<div className="flex items-start gap-4">
			<span aria-hidden="true" className="t-numeral shrink-0 text-title text-(--section-accent)">
				0{step}
			</span>
			<div className="min-w-0">
				<h3 className="text-base font-semibold text-ink">{title}</h3>
				<p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
			</div>
		</div>
	);
}

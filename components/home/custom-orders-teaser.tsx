import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import { toRoman } from "@/lib/utils";
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
		<Section id="custom-orders" accent="vermillion" background="pigment" padded rhythm="grand">
			<Spread
				header={
					<>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
						<Reveal delayMs={staggerDelay(2)}>
							<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
								<a
									href={quickWa}
									target="_blank"
									rel="noopener noreferrer"
									className={buttonVariants({ variant: "primary", size: "lg" })}
								>
									Start on WhatsApp
								</a>
								<SectionCta href="/custom-orders" className="min-h-12">
									Open the brief form
								</SectionCta>
							</div>
						</Reveal>
					</>
				}
			>
				<ol className="divide-y divide-line">
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

/** Numbered steps share the workshops ledger: roman numeral, display title, hairline rows. */
function ProcessStep({
	step,
	title,
	body,
}: Readonly<{ step: number; title: string; body: string }>) {
	return (
		<div className="flex gap-5 py-6 md:gap-6 md:py-8">
			<span
				aria-hidden="true"
				className="t-numeral w-10 shrink-0 pt-1 text-title text-(--section-accent)"
			>
				{toRoman(step)}
			</span>
			<div className="min-w-0 flex-1">
				<h3 className="t-display text-title text-ink">{title}</h3>
				<p className="mt-2 text-base leading-relaxed text-muted">{body}</p>
			</div>
		</div>
	);
}

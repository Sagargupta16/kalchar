import { KachniRule } from "@/components/decor/kachni-rule";
import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { ChannelLink } from "@/components/ui/channel-link";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Contact } from "@/lib/types";

interface ContactTeaserProps {
	contact: Contact;
	eyebrow: string;
	title: string;
	lead?: string;
	/** Prefilled wa.me greeting, shared with the hero (C1/C11). */
	whatsappHref: string;
}

export function ContactTeaser({
	contact,
	eyebrow,
	title,
	lead,
	whatsappHref,
}: Readonly<ContactTeaserProps>) {
	return (
		<Section id="contact" accent="peacock" padded rhythm="grand">
			<KachniRule form="long" className="mb-(--space-block)" />
			<Spread
				header={
					<Reveal>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
					</Reveal>
				}
			>
				<div className="grid gap-(--grid-gap) sm:grid-cols-3">
					<Reveal delayMs={staggerDelay(0)}>
						<ChannelLink
							href={whatsappHref}
							icon={<WhatsAppIcon className="size-5" />}
							label={contact.whatsapp.label}
							display={contact.whatsapp.display ?? contact.whatsapp.label}
							note={contact.whatsapp.note ?? "Fastest reply, usually same-day"}
							highlight
						/>
					</Reveal>
					<Reveal delayMs={staggerDelay(1)}>
						<ChannelLink
							href={contact.instagram.url}
							icon={<InstagramIcon className="size-5" />}
							label={contact.instagram.label}
							display={contact.instagram.display ?? contact.instagram.label}
							note={contact.instagram.note ?? "DMs welcome"}
						/>
					</Reveal>
					<Reveal delayMs={staggerDelay(2)}>
						<ChannelLink
							href={contact.email.url}
							icon={<GmailIcon className="size-5" />}
							label={contact.email.label}
							display={contact.email.display ?? contact.email.label}
							note="Best for longer briefs"
						/>
					</Reveal>
				</div>

				<Reveal delayMs={staggerDelay(3)}>
					<div className="mt-(--space-block)">
						<SectionCta href="/contact">Full contact page</SectionCta>
					</div>
				</Reveal>
			</Spread>
		</Section>
	);
}

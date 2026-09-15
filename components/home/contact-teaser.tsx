import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { ChannelLink } from "@/components/ui/channel-link";
import { Section } from "@/components/ui/section";
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
		<Section id="contact" accent="peacock" padded containerClassName="py-(--space-block)">
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
				<Reveal>
					<header className="max-w-lg">
						<p className="t-eyebrow">{eyebrow}</p>
						<h2 className="t-headline mt-3 text-h2">{title}</h2>
						{lead ? <p className="t-lead mt-4">{lead}</p> : null}
					</header>
					<SectionCta href="/contact" className="mt-6">
						Full contact page
					</SectionCta>
				</Reveal>
				<div className="grid gap-3">
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
			</div>
		</Section>
	);
}

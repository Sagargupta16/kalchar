import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { ChannelLink } from "@/components/ui/channel-link";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { Contact } from "@/lib/types";

interface ContactTeaserProps {
	contact: Contact;
	eyebrow: string;
	title: string;
	lead?: string;
}

export function ContactTeaser({ contact, eyebrow, title, lead }: Readonly<ContactTeaserProps>) {
	return (
		<Section accent="peacock">
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

				<div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-3">
					<Reveal delayMs={80}>
						<ChannelLink
							href={contact.whatsapp.url}
							icon={<WhatsAppIcon className="h-5 w-5" />}
							label={contact.whatsapp.label}
							display={contact.whatsapp.display ?? contact.whatsapp.label}
							note="Fastest reply, usually same-day"
							highlight
						/>
					</Reveal>
					<Reveal delayMs={140}>
						<ChannelLink
							href={contact.instagram.url}
							icon={<InstagramIcon className="h-[18px] w-[18px]" />}
							label={contact.instagram.label}
							display={contact.instagram.display ?? contact.instagram.label}
							note="DMs welcome"
						/>
					</Reveal>
					<Reveal delayMs={200}>
						<ChannelLink
							href={contact.email.url}
							icon={<GmailIcon className="h-[18px] w-[18px]" />}
							label={contact.email.label}
							display={contact.email.display ?? contact.email.label}
							note="Best for longer briefs"
						/>
					</Reveal>
				</div>

				<Reveal delayMs={260}>
					<div className="mt-10 sm:mt-14">
						<Link
							href="/contact"
							className="group inline-flex items-center gap-2 text-sm uppercase tracking-[var(--tracking-meta)] text-(--section-accent) transition-colors hover:opacity-80"
						>
							Full contact page
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

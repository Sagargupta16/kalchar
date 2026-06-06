import { ArrowRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "Contact",
	description:
		"Get in touch about folk-art commissions, workshops, and prints by Megha Seth. WhatsApp, Instagram, or email.",
};

export default function ContactPage() {
	const { contact, sections } = getSite();
	const c = sections.contact;

	return (
		<main>
			<Section accent="peacock">
				<Container size="narrow" className="py-(--section-py)">
					<PageHeader
						eyebrow={c?.eyebrow ?? "Contact"}
						title={c?.title ?? "Get in touch"}
						lead="WhatsApp is the fastest way to reach us. For formal briefs, use email."
					/>

					{/* Primary: WhatsApp */}
					<Reveal delayMs={180}>
						<a
							href={contact.whatsapp.url}
							target="_blank"
							rel="noopener noreferrer"
							className="group mt-10 flex items-center gap-5 rounded-(--radius-md) border border-(--section-accent)/30 bg-bg-soft p-5 transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-lg sm:p-6"
						>
							<IconCircle size="lg" className="group-hover:ring-(--section-accent)">
								<WhatsAppIcon className="h-6 w-6" />
							</IconCircle>
							<div className="flex-1">
								<p className="text-xs font-medium uppercase tracking-[var(--tracking-meta)] text-(--section-accent)">
									<MessageCircle size={11} className="mr-1 inline" />
									Fastest reply
								</p>
								<p className="t-display mt-1 text-2xl transition-colors group-hover:text-(--section-accent) sm:text-3xl">
									{contact.whatsapp.display}
								</p>
								<p className="mt-1 text-sm text-muted">
									Usually same-day. Send a photo, link, or short brief.
								</p>
							</div>
							<ArrowRight
								size={18}
								className="shrink-0 text-muted transition-all duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1 group-hover:text-(--section-accent)"
							/>
						</a>
					</Reveal>

					{/* Instagram accounts (by purpose) */}
					<div className="mt-5 grid gap-4 sm:grid-cols-2">
						<Reveal delayMs={240}>
							<ChannelCard
								href={contact.instagram.url}
								icon={<InstagramIcon className="h-[18px] w-[18px]" />}
								title={contact.instagram.display ?? "@kalchar_by_meghaseth"}
								subtitle="Art and process"
								note={contact.instagram.note}
							/>
						</Reveal>
						{contact.instagramCommunity ? (
							<Reveal delayMs={280}>
								<ChannelCard
									href={contact.instagramCommunity.url}
									icon={<InstagramIcon className="h-[18px] w-[18px]" />}
									title={contact.instagramCommunity.display ?? "@listentoyourart111"}
									subtitle="Workshops and community"
									note={contact.instagramCommunity.note}
								/>
							</Reveal>
						) : null}
					</div>

					{/* Email */}
					<Reveal delayMs={320}>
						<a
							href={contact.email.url}
							className="group mt-5 flex items-center gap-4 rounded-(--radius-md) border border-line bg-bg p-4 transition-all duration-(--duration-base) ease-(--ease-out) hover:border-(--section-accent) sm:p-5"
						>
							<IconCircle size="sm">
								<GmailIcon className="h-4 w-4" />
							</IconCircle>
							<div className="flex-1">
								<p className="text-sm font-medium">{contact.email.display}</p>
								<p className="text-xs text-muted">For longer briefs or formal enquiries</p>
							</div>
							<ArrowRight
								size={14}
								className="shrink-0 text-muted transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</a>
					</Reveal>

					{/* QR scan section */}
					<Reveal delayMs={360}>
						<div className="mt-10 flex flex-col items-center gap-5 rounded-(--radius-md) border border-line-soft bg-bg-soft p-6 text-center sm:flex-row sm:text-left">
							<a
								href={contact.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="block shrink-0"
							>
								<Image
									src="/instagram-qr.png"
									alt="QR code for @kalchar_by_meghaseth on Instagram"
									width={2350}
									height={2700}
									loading="lazy"
									className="h-auto w-28 rounded-(--radius-sm) border border-line bg-bg p-1.5 sm:w-32"
								/>
							</a>
							<div>
								<p className="text-sm font-medium">Scan to follow on Instagram</p>
								<p className="mt-1 text-xs text-muted">
									Point your camera at the code, or tap it to open the profile.
								</p>
								{contact.instagramPersonal ? (
									<a
										href={contact.instagramPersonal.url}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
									>
										Also find Megha at {contact.instagramPersonal.display}
									</a>
								) : null}
							</div>
						</div>
					</Reveal>

					{/* Custom orders CTA */}
					<Reveal delayMs={400}>
						<div className="mt-10 flex flex-col items-start gap-4 rounded-(--radius-md) border border-line bg-bg p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
							<div>
								<p className="t-eyebrow">Ready to commission?</p>
								<p className="t-display mt-1.5 text-xl">Order a custom piece</p>
							</div>
							<Link
								href="/custom-orders"
								className={cn(buttonVariants({ variant: "primary" }), "group")}
							>
								Start a brief
								<ArrowRight
									size={16}
									aria-hidden="true"
									className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
								/>
							</Link>
						</div>
					</Reveal>
				</Container>
			</Section>
		</main>
	);
}

function ChannelCard({
	href,
	icon,
	title,
	subtitle,
	note,
}: Readonly<{
	href: string;
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	note?: string;
}>) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="group flex h-full items-start gap-4 rounded-(--radius-md) border border-line bg-bg p-4 transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-md sm:p-5"
		>
			<IconCircle size="sm" className="group-hover:ring-(--section-accent)">
				{icon}
			</IconCircle>
			<div className="min-w-0 flex-1">
				<p className="t-display truncate text-base transition-colors group-hover:text-(--section-accent) sm:text-lg">
					{title}
				</p>
				<p className="text-xs font-medium text-muted">{subtitle}</p>
				{note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
			</div>
		</a>
	);
}

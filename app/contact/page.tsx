import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChannelLink } from "@/components/ui/channel-link";
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
						lead={c?.lead}
					/>

					{/* Primary: WhatsApp */}
					<Reveal delayMs={200}>
						<a
							href={contact.whatsapp.url}
							target="_blank"
							rel="noopener noreferrer"
							className="group mt-10 block rounded-(--radius-md) border border-line bg-bg-soft p-6 transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-lg sm:p-8"
						>
							<div className="flex items-start gap-5">
								<IconCircle size="lg" className="group-hover:ring-(--section-accent)">
									<WhatsAppIcon className="h-6 w-6" />
								</IconCircle>
								<div className="flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="t-eyebrow">{contact.whatsapp.label}</p>
										<span className="rounded-full bg-(--section-accent) px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[var(--tracking-meta)] text-bg">
											Fastest reply
										</span>
									</div>
									<p className="t-display mt-2 text-2xl transition-colors group-hover:text-(--section-accent) sm:text-3xl">
										{contact.whatsapp.display ?? contact.whatsapp.label}
									</p>
									<p className="mt-2 text-sm text-muted">
										Usually same-day. Send a photo, link, or short brief.
									</p>
								</div>
								<ArrowRight
									size={18}
									className="mt-2 shrink-0 text-muted transition-all duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1 group-hover:text-(--section-accent)"
								/>
							</div>
						</a>
					</Reveal>

					{/* Instagram QR */}
					<Reveal delayMs={240}>
						<Card
							padding="lg"
							className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8"
						>
							<a
								href={contact.instagram.url}
								target="_blank"
								rel="noopener noreferrer"
								className="group block"
							>
								<Image
									src="/instagram-qr.png"
									alt=""
									width={2350}
									height={2700}
									loading="lazy"
									className="block h-auto w-40 rounded-(--radius-md) border border-line bg-bg p-2 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:-translate-y-0.5 group-hover:border-(--section-accent) sm:w-48"
								/>
							</a>
							<div>
								<p className="t-eyebrow">Scan to follow</p>
								<p className="t-display mt-2 text-xl sm:text-2xl">Or scan, point, follow</p>
								<p className="mt-2 text-sm text-muted">
									Tap-and-hold on a phone, point a camera on desktop.
								</p>
								<a
									href={contact.instagram.url}
									target="_blank"
									rel="noopener noreferrer"
									className="mt-4 inline-flex items-center gap-2 text-sm uppercase tracking-[var(--tracking-meta)] text-(--section-accent) transition-opacity hover:opacity-80"
								>
									Open Instagram
									<ArrowRight size={14} aria-hidden="true" />
								</a>
							</div>
						</Card>
					</Reveal>

					{/* Instagram accounts */}
					<div className="mt-5 grid gap-5 sm:grid-cols-2">
						<Reveal delayMs={260}>
							<ChannelLink
								href={contact.instagram.url}
								icon={<InstagramIcon className="h-[18px] w-[18px]" />}
								label={contact.instagram.label}
								display={contact.instagram.display ?? contact.instagram.label}
								note={contact.instagram.note ?? "Original paintings and process"}
							/>
						</Reveal>
						{contact.instagramCommunity ? (
							<Reveal delayMs={300}>
								<ChannelLink
									href={contact.instagramCommunity.url}
									icon={<InstagramIcon className="h-[18px] w-[18px]" />}
									label={contact.instagramCommunity.label}
									display={contact.instagramCommunity.display ?? contact.instagramCommunity.label}
									note={contact.instagramCommunity.note ?? "Workshops and community"}
								/>
							</Reveal>
						) : null}
					</div>

					{/* Email */}
					<Reveal delayMs={340}>
						<div className="mt-5">
							<ChannelLink
								href={contact.email.url}
								icon={<GmailIcon className="h-[18px] w-[18px]" />}
								label={contact.email.label}
								display={contact.email.display ?? contact.email.label}
								note={contact.email.note ?? "Best for longer briefs or formal enquiries."}
							/>
						</div>
					</Reveal>

					{/* Custom orders CTA */}
					<Reveal delayMs={320}>
						<Card
							padding="lg"
							className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p className="t-eyebrow">Custom orders</p>
								<p className="t-display mt-2 text-xl sm:text-2xl">Order a custom piece</p>
								<p className="mt-1 text-sm text-muted">Send a brief and we'll talk on WhatsApp.</p>
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
						</Card>
					</Reveal>
				</Container>
			</Section>
		</main>
	);
}

import { ArrowRight, BookOpen, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ClosingCta } from "@/components/ui/closing-cta";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import type { ContactChannel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "Contact",
	description:
		"Get in touch about folk-art commissions, workshops, and prints by Megha Seth. WhatsApp, Instagram, YouTube, or email.",
	path: "/contact/",
});

/** The one link-card recipe: resting surface, 2px lift to e2 with the section pigment, global focus. */
const linkCard = cardVariants({ padding: "none", interactive: true });

/** Keep the primary channel's border neutral while its surface lifts on hover. */
const whatsAppCard =
	"group flex items-center gap-4 rounded-(--radius-md) border border-line bg-surface p-(--card-pad) shadow-e1 transition-ui pressable elevate-e2 hover:-translate-y-0.5 dark:hover:bg-surface-raised";

export default function ContactPage() {
	const { contact, sections } = getSite();
	const contactCopy = sections.contact;
	const whatsappUrl = contact.whatsapp.url.trim();
	const emailUrl = contact.email.url.trim();
	const catalogUrl = contact.whatsapp.catalog?.trim();
	const socialChannels = [contact.instagram, contact.instagramCommunity, contact.youtube].filter(
		(channel) => channel?.url.trim(),
	);
	const hasQrCodes = socialChannels.some((channel) => channel?.qr?.trim());

	return (
		<main>
			<Section
				accent="peacock"
				background="wash"
				padded
				size="narrow"
				containerClassName="py-(--space-block)"
			>
				<PageHeader
					eyebrow={contactCopy?.eyebrow ?? "Contact"}
					title={contactCopy?.title ?? "Get in touch"}
					lead="Get in touch about artwork, workshops, or a custom piece. Choose the channel that suits your enquiry."
				/>
			</Section>

			<Section accent="peacock" padded size="narrow" containerClassName="pt-(--space-block)">
				<div className="grid gap-4">
					{whatsappUrl ? (
						<Reveal delayMs={staggerDelay(0)}>
							<a
								href={whatsappUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={whatsAppCard}
							>
								<IconCircle size="lg" className="group-hover:ring-(--section-accent)">
									<WhatsAppIcon className="size-6" />
								</IconCircle>
								<div className="min-w-0 flex-1">
									<p className="t-meta inline-flex items-center gap-1 font-medium text-(--section-accent)">
										<MessageCircle size={12} aria-hidden="true" />
										Fastest reply
									</p>
									<h2 className="mt-2 text-base font-medium text-ink">Chat on WhatsApp</h2>
									{contact.whatsapp.display?.trim() ? (
										<p className="t-numeral mt-1 select-all break-words text-2xl text-ink transition-colors group-hover:text-(--section-accent) sm:text-h2">
											{contact.whatsapp.display.trim()}
										</p>
									) : null}
									<p className="mt-1 text-sm text-muted">
										{contact.whatsapp.note?.trim() ||
											"Usually same-day. Send a photo, link, or short brief."}
									</p>
									<p className="mt-2 text-xs text-muted">Opens WhatsApp with a new conversation</p>
								</div>
								<ArrowRight
									size={18}
									aria-hidden="true"
									className="hidden shrink-0 text-muted transition-[transform,color] group-hover:translate-x-1 group-hover:text-(--section-accent) sm:block"
								/>
							</a>
						</Reveal>
					) : null}

					{/* WhatsApp catalogue (when set) -- browse pieces for sale in-app */}
					{catalogUrl ? (
						<Reveal delayMs={staggerDelay(1)}>
							<a
								href={catalogUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									buttonVariants({ variant: "secondary" }),
									"group w-full whitespace-normal sm:w-auto",
								)}
							>
								<BookOpen size={16} aria-hidden="true" />
								Browse the WhatsApp catalogue
								<ArrowRight
									size={14}
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-1"
								/>
							</a>
						</Reveal>
					) : null}

					{emailUrl ? (
						<Reveal delayMs={staggerDelay(2)}>
							<a
								href={emailUrl}
								className={cn(linkCard, "group flex items-center gap-4 p-(--card-pad)")}
							>
								<IconCircle size="sm">
									<GmailIcon className="size-3.5" />
								</IconCircle>
								<div className="min-w-0 flex-1">
									<h2 className="text-base font-medium">Email us</h2>
									{contact.email.display?.trim() ? (
										<p className="mt-1 text-sm [overflow-wrap:anywhere]">
											{contact.email.display.trim()}
										</p>
									) : null}
									<p className="text-sm text-muted">
										{contact.email.note?.trim() || "For longer briefs or formal enquiries"}
									</p>
								</div>
								<ArrowRight
									size={14}
									aria-hidden="true"
									className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
								/>
							</a>
						</Reveal>
					) : null}
					{!whatsappUrl && !emailUrl ? (
						<Reveal>
							<p className="text-sm text-muted">
								WhatsApp and email details are currently unavailable. Please check back soon.
							</p>
						</Reveal>
					) : null}
				</div>

				{/* Follow along: the broadcast channels as museum plates (QR tiles
				    scan from another device at 1280; tap opens on a phone). */}
				{socialChannels.length > 0 ? (
					<div className="mt-(--space-block)">
						<Reveal delayMs={staggerDelay(0)}>
							<h2 className="t-eyebrow">Follow along</h2>
							<p className="mt-3 text-sm text-muted">
								{hasQrCodes
									? "Open a profile below, or scan its QR code from another device."
									: "Open a profile below for our latest work and studio updates."}
							</p>
						</Reveal>
						<ul className="mt-5 grid grid-cols-2 gap-x-(--grid-gap) gap-y-8 lg:grid-cols-3">
							{contact.instagram.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(1)}>
									<ChannelPlate
										channel={contact.instagram}
										icon={<InstagramIcon className="size-3.5 shrink-0" aria-hidden="true" />}
										glyph={<InstagramIcon className="size-8" aria-hidden="true" />}
										actionLabel="Open Instagram"
									/>
								</Reveal>
							) : null}
							{contact.instagramCommunity?.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(2)}>
									<ChannelPlate
										channel={contact.instagramCommunity}
										icon={<InstagramIcon className="size-3.5 shrink-0" aria-hidden="true" />}
										glyph={<InstagramIcon className="size-8" aria-hidden="true" />}
										actionLabel="Open Instagram"
									/>
								</Reveal>
							) : null}
							{contact.youtube?.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(3)}>
									<ChannelPlate
										channel={contact.youtube}
										icon={<YouTubeIcon className="size-3.5 shrink-0" aria-hidden="true" />}
										fallbackNote="Watch on YouTube"
										glyph={<YouTubeIcon className="size-8" aria-hidden="true" />}
										actionLabel="Open YouTube"
									/>
								</Reveal>
							) : null}
						</ul>
					</div>
				) : null}

				{/* Personal IG (subtle) */}
				{contact.instagramPersonal?.url.trim() ? (
					<Reveal delayMs={staggerDelay(4)}>
						<p className="mt-8 text-center text-sm text-muted">
							Also find Megha at{" "}
							<a
								href={contact.instagramPersonal.url.trim()}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-control items-center underline decoration-line/60 underline-offset-3 transition-colors hover:text-accent-text hover:decoration-accent"
							>
								{contact.instagramPersonal.display?.trim() ||
									contact.instagramPersonal.label.trim() ||
									"Personal Instagram"}
							</a>
						</p>
					</Reveal>
				) : null}

				{/* Custom orders CTA */}
				<Reveal delayMs={staggerDelay(5)}>
					<ClosingCta
						eyebrow="Ready to commission?"
						title="Order a custom piece"
						action={
							<Link
								href="/custom-orders"
								className={cn(buttonVariants({ variant: "primary" }), "group w-full sm:w-auto")}
							>
								Start a brief
								<ArrowRight
									size={16}
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-1"
								/>
							</Link>
						}
					/>
				</Reveal>
			</Section>
		</main>
	);
}

/**
 * One broadcast channel as a plate + wall label (visual-direction 2.9). The
 * whole tile is one link: tap on a phone opens the profile, scan the QR from
 * another device opens it too. Channels without a QR (YouTube) show a glyph
 * plate; the handle and purpose caption read as the wall label.
 */
function ChannelPlate({
	channel,
	icon,
	actionLabel,
	fallbackNote,
	glyph,
}: Readonly<{
	channel: ContactChannel;
	/** Small brand glyph beside the profile action. */
	icon: ReactNode;
	actionLabel: string;
	fallbackNote?: string;
	/** Large glyph for the plate when the channel has no QR image. */
	glyph: ReactNode;
}>) {
	const title = channel.display?.trim() || channel.label.trim() || actionLabel;
	const qr = channel.qr?.trim();

	return (
		<a
			href={channel.url.trim()}
			aria-label={`${channel.label.trim() || actionLabel}: ${title}`}
			target="_blank"
			rel="noopener noreferrer"
			className="group block pressable"
		>
			<figure>
				<PlateFrame className="aspect-square">
					{qr ? (
						// The QR unveils like a plate; the clip lives on the layer inside
						// the frame so the hover lift and shadow are never cropped.
						<Reveal variant="plate" className="absolute inset-0">
							<Image
								src={`/${qr}`}
								alt={`QR code for ${title}`}
								width={334}
								height={384}
								sizes="(min-width: 1024px) 224px, 45vw"
								loading="lazy"
								className="absolute inset-0 h-full w-full bg-surface object-contain p-4"
							/>
						</Reveal>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-canvas text-(--section-accent)">
							{glyph}
						</div>
					)}
				</PlateFrame>
				<WallLabel
					as="figcaption"
					className="mt-4"
					title={title}
					titleClassName="break-words transition-colors group-hover:text-(--section-accent)"
					meta={[channel.note?.trim() || fallbackNote || ""]}
				/>
			</figure>
			<p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
				{icon}
				<span>{actionLabel}</span>
				<ArrowRight
					size={12}
					aria-hidden="true"
					className="shrink-0 transition-transform group-hover:translate-x-1"
				/>
			</p>
		</a>
	);
}

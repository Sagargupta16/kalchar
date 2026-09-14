import { ArrowRight, BookOpen, MessageCircle, QrCode } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
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

/**
 * The plate of the page (visual-direction 2.9): a 2px gold top seam over the
 * hairline + e2 composite (one shadow utility, anti-pattern 11; rest stepped
 * e1 -> e2 and hover to the elevate-e3 crossfade with the layered-shadow
 * steering 2026-09-14), written out because stacking a second shadow-* on
 * cardVariants is banned. Solid on purpose: nothing passes behind it.
 */
const whatsAppCard =
	"group flex items-center gap-5 rounded-(--radius-md) border border-line border-t-2 border-t-(--color-gold-hairline) bg-surface p-(--card-pad) shadow-e2-edged transition-ui pressable elevate-e3 hover:-translate-y-0.5 dark:hover:bg-surface-raised";

export default function ContactPage() {
	const { contact, sections } = getSite();
	const contactCopy = sections.contact;

	return (
		<main>
			{/* The standard public page header (visual-direction 2.0): grand rhythm
			    on the flat peacock wash band with the short kachni rule. */}
			<Section accent="peacock" background="wash" rhythm="grand" padded size="narrow">
				<PageHeader
					kachni
					eyebrow={contactCopy?.eyebrow ?? "Contact"}
					title={contactCopy?.title ?? "Get in touch"}
					lead="WhatsApp is the fastest way to reach us. For formal briefs, use email. Follow along on Instagram and YouTube."
				/>
			</Section>

			<Section accent="peacock" padded size="narrow" containerClassName="pt-(--space-block)">
				{/* Reply channels first: WhatsApp, then the catalogue, then email. */}
				<Reveal delayMs={staggerDelay(0)}>
					<a
						href={contact.whatsapp.url}
						target="_blank"
						rel="noopener noreferrer"
						className={whatsAppCard}
					>
						<IconCircle size="lg" className="group-hover:ring-(--section-accent)">
							<WhatsAppIcon className="size-6" />
						</IconCircle>
						<div className="flex-1">
							<p className="t-meta inline-flex items-center gap-1 font-medium text-(--section-accent)">
								<MessageCircle size={12} aria-hidden="true" />
								Fastest reply
							</p>
							{/* The one place a number is the headline: the numeral voice at
							    the h2 rung, tabular, select-all so it copies in one gesture. */}
							<p className="t-numeral mt-1 select-all text-h2 text-ink transition-colors group-hover:text-(--section-accent)">
								{contact.whatsapp.display}
							</p>
							<p className="mt-1 text-sm text-muted">
								{contact.whatsapp.note ?? "Usually same-day. Send a photo, link, or short brief."}
							</p>
						</div>
						<ArrowRight
							size={18}
							className="shrink-0 text-muted transition-[transform,color] group-hover:translate-x-1 group-hover:text-(--section-accent)"
						/>
					</a>
				</Reveal>

				{/* WhatsApp catalogue (when set) -- browse pieces for sale in-app */}
				{contact.whatsapp.catalog ? (
					<Reveal delayMs={staggerDelay(1)}>
						<a
							href={contact.whatsapp.catalog}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								buttonVariants({ variant: "secondary" }),
								"group mt-4 w-full sm:w-auto",
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

				{/* Email: the second reply channel sits directly under the first. */}
				<Reveal delayMs={staggerDelay(2)}>
					<a
						href={contact.email.url}
						className={cn(linkCard, "group mt-4 flex items-center gap-4 p-(--card-pad)")}
					>
						<IconCircle size="sm">
							<GmailIcon className="size-3.5" />
						</IconCircle>
						<div className="flex-1">
							<p className="text-sm font-medium">{contact.email.display}</p>
							<p className="text-sm text-muted">
								{contact.email.note ?? "For longer briefs or formal enquiries"}
							</p>
						</div>
						<ArrowRight
							size={14}
							className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
						/>
					</a>
				</Reveal>

				{/* Follow along: the broadcast channels as museum plates (QR tiles
				    scan from another device at 1280; tap opens on a phone). */}
				<div className="mt-(--space-block)">
					<Reveal delayMs={staggerDelay(0)}>
						<p className="t-eyebrow flex items-center gap-2">
							<AccentRule />
							Follow along
						</p>
					</Reveal>
					<ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
						<Reveal as="li" delayMs={staggerDelay(1)}>
							<ChannelPlate
								channel={contact.instagram}
								icon={<InstagramIcon className="size-3.5 shrink-0" aria-hidden="true" />}
								qrAlt={`QR code for ${contact.instagram.display} on Instagram`}
							/>
						</Reveal>
						{contact.instagramCommunity ? (
							<Reveal as="li" delayMs={staggerDelay(2)}>
								<ChannelPlate
									channel={contact.instagramCommunity}
									icon={<InstagramIcon className="size-3.5 shrink-0" aria-hidden="true" />}
									qrAlt={`QR code for ${contact.instagramCommunity.display} on Instagram`}
								/>
							</Reveal>
						) : null}
						{contact.youtube ? (
							<Reveal as="li" delayMs={staggerDelay(3)}>
								<ChannelPlate
									channel={contact.youtube}
									icon={<YouTubeIcon className="size-3.5 shrink-0" aria-hidden="true" />}
									fallbackNote="Watch on YouTube"
									glyph={<YouTubeIcon className="size-8" aria-hidden="true" />}
								/>
							</Reveal>
						) : null}
					</ul>
				</div>

				{/* Personal IG (subtle) */}
				{contact.instagramPersonal ? (
					<Reveal delayMs={staggerDelay(4)}>
						<p className="mt-8 text-center text-sm text-muted">
							Also find Megha at{" "}
							<a
								href={contact.instagramPersonal.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-control items-center underline decoration-line/60 underline-offset-3 transition-colors hover:text-accent-text hover:decoration-accent"
							>
								{contact.instagramPersonal.display}
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
	qrAlt,
	fallbackNote,
	glyph,
}: Readonly<{
	channel: ContactChannel;
	/** Small brand glyph on the "Scan or tap" line. */
	icon: ReactNode;
	qrAlt?: string;
	fallbackNote?: string;
	/** Large glyph for the plate when the channel has no QR image. */
	glyph?: ReactNode;
}>) {
	return (
		<a
			href={channel.url}
			target="_blank"
			rel="noopener noreferrer"
			className="group block pressable"
		>
			<figure>
				<PlateFrame className="aspect-square">
					{channel.qr ? (
						// The QR unveils like a plate; the clip lives on the layer inside
						// the frame so the hover lift and shadow are never cropped.
						<Reveal variant="plate" className="absolute inset-0">
							<Image
								src={`/${channel.qr}`}
								alt={qrAlt ?? `QR code for ${channel.display}`}
								width={334}
								height={384}
								sizes="(min-width: 1024px) 224px, 45vw"
								loading="lazy"
								className="absolute inset-0 h-full w-full bg-surface object-contain p-4"
							/>
						</Reveal>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-canvas text-(--section-accent)">
							{glyph ?? <QrCode size={28} aria-hidden="true" />}
						</div>
					)}
				</PlateFrame>
				<WallLabel
					as="figcaption"
					className="mt-4"
					title={channel.display ?? channel.label}
					titleClassName="break-words transition-colors group-hover:text-(--section-accent)"
					meta={[channel.note ?? fallbackNote ?? ""]}
				/>
			</figure>
			{/* The scan affordance only makes sense on a QR plate; glyph tiles just tap. */}
			{channel.qr ? (
				<p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
					{icon}
					Scan or tap
					<ArrowRight
						size={12}
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-1"
					/>
				</p>
			) : (
				<p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
					{icon}
					<ArrowRight
						size={12}
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-1"
					/>
				</p>
			)}
		</a>
	);
}

import { ArrowRight, BookOpen, MessageCircle, QrCode } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { Badge } from "@/components/ui/badge";
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

export default function ContactPage() {
	const { contact, sections } = getSite();
	const contactCopy = sections.contact;

	return (
		<main className="[--shadow-ink:0.2_0.02_220]">
			<Section accent="peacock" padded size="narrow">
				<PageHeader
					eyebrow={contactCopy?.eyebrow ?? "Contact"}
					title={contactCopy?.title ?? "Get in touch"}
					lead="WhatsApp is the fastest way to reach us. For formal briefs, use email. Follow along on Instagram and YouTube."
				/>

				{/* Reply channels first: WhatsApp, then the catalogue, then email. */}
				<Reveal delayMs={staggerDelay(0)}>
					<a
						href={contact.whatsapp.url}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							linkCard,
							"group mt-(--space-block) flex items-center gap-5 border-(--section-accent)/30 bg-canvas p-(--card-pad)",
						)}
					>
						<IconCircle size="lg" className="group-hover:ring-(--section-accent)">
							<WhatsAppIcon className="size-6" />
						</IconCircle>
						<div className="flex-1">
							<p className="t-meta inline-flex items-center gap-1 font-medium text-(--section-accent)">
								<MessageCircle size={12} aria-hidden="true" />
								Fastest reply
							</p>
							<p className="t-display mt-1 text-title transition-colors group-hover:text-(--section-accent)">
								{contact.whatsapp.display}
							</p>
							<p className="mt-1 text-sm text-muted">
								Usually same-day. Send a photo, link, or short brief.
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
							<p className="text-sm text-muted">For longer briefs or formal enquiries</p>
						</div>
						<ArrowRight
							size={14}
							className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
						/>
					</a>
				</Reveal>

				{/* Follow along: Instagram QR cards and YouTube */}
				<div className="mt-(--space-block)">
					<Reveal delayMs={staggerDelay(0)}>
						<p className="t-eyebrow flex items-center gap-2">
							<AccentRule />
							Follow along
						</p>
					</Reveal>
					<div className={cn("mt-5 grid gap-4", contact.instagramCommunity && "sm:grid-cols-2")}>
						<Reveal delayMs={staggerDelay(1)}>
							<InstagramQrCard channel={contact.instagram} />
						</Reveal>
						{contact.instagramCommunity ? (
							<Reveal delayMs={staggerDelay(2)}>
								<InstagramQrCard channel={contact.instagramCommunity} />
							</Reveal>
						) : null}
					</div>

					{contact.youtube ? (
						<Reveal delayMs={staggerDelay(3)}>
							<a
								href={contact.youtube.url}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(linkCard, "group mt-4 flex items-center gap-4 p-(--card-pad)")}
							>
								<IconCircle size="sm">
									<YouTubeIcon className="size-3.5" />
								</IconCircle>
								<div className="flex-1">
									<p className="text-sm font-medium">{contact.youtube.display}</p>
									<p className="text-sm text-muted">{contact.youtube.note ?? "Watch on YouTube"}</p>
								</div>
								<ArrowRight
									size={14}
									className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
								/>
							</a>
						</Reveal>
					) : null}
				</div>

				{/* Personal IG (subtle) */}
				{contact.instagramPersonal ? (
					<Reveal delayMs={staggerDelay(4)}>
						<p className="mt-6 text-center text-sm text-muted">
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
 * Instagram card with a scan-or-tap QR. The whole card is one link: tap on a
 * phone opens the profile, scan the QR from another device opens it too. The
 * QR plate is the visual anchor; handle + purpose tag sit beside it.
 */
function InstagramQrCard({ channel }: Readonly<{ channel: ContactChannel }>) {
	return (
		<a
			href={channel.url}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(linkCard, "group flex h-full items-center gap-4 p-(--card-pad)")}
		>
			{/* QR plate */}
			<div className="relative shrink-0">
				{channel.qr ? (
					<Image
						src={`/${channel.qr}`}
						alt={`QR code for ${channel.display} on Instagram`}
						width={334}
						height={384}
						sizes="112px"
						loading="lazy"
						className="size-24 rounded-(--radius-sm) border border-line bg-surface object-contain p-1.5 transition-colors group-hover:border-(--section-accent) sm:size-28"
					/>
				) : (
					<div className="grid size-24 place-items-center rounded-(--radius-sm) border border-line bg-canvas text-muted sm:size-28">
						<QrCode size={28} />
					</div>
				)}
			</div>

			{/* Text */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-(--section-accent)">
					<InstagramIcon className="size-4 shrink-0" aria-hidden="true" />
					<Badge variant="muted">{channel.note}</Badge>
				</div>
				<p className="t-display mt-2 break-words text-h3 transition-colors group-hover:text-(--section-accent)">
					{channel.display}
				</p>
				<p className="mt-2 inline-flex items-center gap-1 text-sm text-muted">
					Scan or tap
					<ArrowRight
						size={12}
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-1"
					/>
				</p>
			</div>
		</a>
	);
}

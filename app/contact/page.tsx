import { ArrowRight, ArrowUpRight, BookOpen, MessageCircle, ScanLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ClosingCta } from "@/components/ui/closing-cta";
import { Section, SectionHeader } from "@/components/ui/section";
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

/**
 * Hover and tap feedback shared by the two message rows: a pigment tint
 * sweeps in from the left (transform only, on ::before behind the copy) while
 * the card lifts 2px and its shadow crossfades up one rung (elevate-e2).
 */
const SWEEP =
	"before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:rounded-[inherit] before:bg-(--section-accent)/8 before:transition-transform before:duration-500 before:ease-(--ease-out) hover:before:scale-x-100 active:before:scale-x-100";

/** The one link-card recipe: resting surface, 2px lift to e2 with the section pigment, global focus. */
const linkCard = cardVariants({ padding: "none", interactive: true });

/** Keep the primary channel's border neutral while its surface lifts on hover. */
const whatsAppCard =
	"group flex items-center gap-4 rounded-(--radius-md) border border-line bg-surface p-(--card-pad-lg) shadow-e1 transition-ui pressable elevate-e2 hover:-translate-y-0.5 sm:gap-6";

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
			<PageHero
				accent="peacock"
				glyph="नमस्ते"
				eyebrow={contactCopy?.eyebrow ?? "Contact"}
				title={contactCopy?.title ?? "Get in touch"}
				lead="Get in touch about artwork, workshops, or a custom piece. Choose the channel that suits your enquiry."
			>
				<Reveal eager delayMs={staggerDelay(5)}>
					<p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-sm font-medium text-ink">
						<span aria-hidden="true" className="relative flex size-2">
							<span className="absolute inset-0 animate-ping rounded-full bg-(--section-accent)" />
							<span className="relative size-2 rounded-full bg-(--section-accent)" />
						</span>
						{contact.whatsapp.note?.trim() || "Usually same-day on WhatsApp"}
					</p>
				</Reveal>
			</PageHero>

			<Section accent="peacock" padded containerClassName="pt-(--space-canyon)">
				<div className="grid gap-(--space-block) lg:grid-cols-12 lg:gap-12">
					<div className="lg:col-span-4">
						<SectionHeader
							eyebrow="Message us"
							title="Start a conversation"
							lead="WhatsApp is the quickest way to reach us. Email suits longer briefs."
						/>
					</div>
					<div className="grid content-start gap-4 lg:col-span-8">
						<WhatsAppContactCard channel={contact.whatsapp} href={whatsappUrl} />

						{/* WhatsApp catalogue (when set): browse pieces for sale in-app */}
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
									<ArrowRight size={14} aria-hidden="true" />
								</a>
							</Reveal>
						) : null}

						<EmailContactCard channel={contact.email} href={emailUrl} />
						{!whatsappUrl && !emailUrl ? (
							<Reveal>
								<p className="text-sm text-muted">
									WhatsApp and email details are currently unavailable. Please check back soon.
								</p>
							</Reveal>
						) : null}
					</div>
				</div>

				{/* Follow along: the broadcast channels as QR cards (scan from another
				    device on desktop; tap opens the profile on a phone). */}
				{socialChannels.length > 0 ? (
					<div className="mt-(--space-canyon) border-t border-line pt-(--space-block)">
						<SectionHeader
							eyebrow="Follow along"
							title="Studio updates and process"
							lead={
								hasQrCodes
									? "Open a profile below, or scan its QR code from another device."
									: "Open a profile below for our latest work and studio updates."
							}
						/>
						<ul className="mt-8 grid grid-cols-2 gap-(--grid-gap) lg:grid-cols-3">
							{contact.instagram.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(0)}>
									<ChannelCard
										channel={contact.instagram}
										icon={<InstagramIcon className="size-4 shrink-0" aria-hidden="true" />}
										glyph={<InstagramIcon className="size-10" aria-hidden="true" />}
										actionLabel="Open Instagram"
									/>
								</Reveal>
							) : null}
							{contact.instagramCommunity?.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(1)}>
									<ChannelCard
										channel={contact.instagramCommunity}
										icon={<InstagramIcon className="size-4 shrink-0" aria-hidden="true" />}
										glyph={<InstagramIcon className="size-10" aria-hidden="true" />}
										actionLabel="Open Instagram"
									/>
								</Reveal>
							) : null}
							{contact.youtube?.url.trim() ? (
								<Reveal as="li" delayMs={staggerDelay(2)} className="max-lg:col-span-2">
									<ChannelCard
										wide
										channel={contact.youtube}
										icon={<YouTubeIcon className="size-4 shrink-0" aria-hidden="true" />}
										fallbackNote="Watch on YouTube"
										glyph={<YouTubeIcon className="size-10" aria-hidden="true" />}
										actionLabel="Open YouTube"
									/>
								</Reveal>
							) : null}
						</ul>
					</div>
				) : null}

				{/* Personal IG (subtle) */}
				{contact.instagramPersonal?.url.trim() ? (
					<Reveal delayMs={staggerDelay(3)}>
						<p className="mt-8 text-center text-sm text-muted">
							Also find Megha at{" "}
							<a
								href={contact.instagramPersonal.url.trim()}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-control items-center underline decoration-line-strong underline-offset-3 transition-colors hover:text-accent-text hover:decoration-accent"
							>
								{contact.instagramPersonal.display?.trim() ||
									contact.instagramPersonal.label.trim() ||
									"Personal Instagram"}
							</a>
						</p>
					</Reveal>
				) : null}

				{/* Custom orders CTA */}
				<ClosingCta
					eyebrow="Ready to commission?"
					title="Order a custom piece"
					body="Send a short brief and we will reply on WhatsApp with ideas, a price and a timeline."
					action={
						<Link
							href="/custom-orders"
							className={cn(
								buttonVariants({ variant: "primary", size: "lg" }),
								"w-full whitespace-normal sm:w-auto",
							)}
						>
							Start a brief
							<ArrowRight size={16} aria-hidden="true" />
						</Link>
					}
				/>
			</Section>
		</main>
	);
}

/** The arrow disc at the end of a message row: fills with the pigment and turns on hover. */
function ArrowDisc() {
	return (
		<span
			aria-hidden="true"
			className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-muted transition-ui duration-300 group-hover:rotate-45 group-hover:border-(--section-accent) group-hover:bg-(--section-accent) group-hover:text-bg"
		>
			<ArrowUpRight size={18} />
		</span>
	);
}

function WhatsAppContactCard({
	channel,
	href,
}: Readonly<{ channel: ContactChannel; href: string }>) {
	if (!href) return null;

	return (
		<Reveal delayMs={staggerDelay(0)}>
			<a href={href} target="_blank" rel="noopener noreferrer" className={cn(whatsAppCard, SWEEP)}>
				<span
					aria-hidden="true"
					className="hidden size-16 shrink-0 place-items-center rounded-full bg-(--section-accent) text-bg transition-transform duration-500 group-hover:-rotate-12 sm:grid"
				>
					<WhatsAppIcon className="size-7" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="t-meta inline-flex items-center gap-1.5 font-medium text-(--section-accent)">
						<MessageCircle size={12} aria-hidden="true" />
						Fastest reply
					</p>
					<h2 className="mt-2 text-base font-medium text-ink">Chat on WhatsApp</h2>
					{channel.display?.trim() ? (
						<p className="mt-1 select-all break-words text-2xl font-semibold tracking-tight tabular-nums lining-nums text-ink transition-colors group-hover:text-(--section-accent) sm:text-3xl">
							{channel.display.trim()}
						</p>
					) : null}
					<p className="mt-2 text-sm text-muted">
						{channel.note?.trim() || "Usually same-day. Send a photo, link, or short brief."}
					</p>
					<p className="mt-1 text-xs text-muted">Opens WhatsApp with a new conversation</p>
				</div>
				<ArrowDisc />
			</a>
		</Reveal>
	);
}

function EmailContactCard({ channel, href }: Readonly<{ channel: ContactChannel; href: string }>) {
	if (!href) return null;

	return (
		<Reveal delayMs={staggerDelay(2)}>
			<a
				href={href}
				className={cn(linkCard, SWEEP, "group flex items-center gap-4 p-(--card-pad-lg) sm:gap-6")}
			>
				<span
					aria-hidden="true"
					className="hidden size-16 shrink-0 place-items-center rounded-full bg-canvas text-(--section-accent) ring-1 ring-line transition-transform duration-500 group-hover:-rotate-12 sm:grid"
				>
					<GmailIcon className="size-6" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="t-meta">Longer briefs</p>
					<h2 className="mt-2 text-base font-medium text-ink">Email us</h2>
					{channel.display?.trim() ? (
						<p className="mt-1 text-lg font-semibold tracking-tight text-ink [overflow-wrap:anywhere] transition-colors group-hover:text-(--section-accent) sm:text-xl">
							{channel.display.trim()}
						</p>
					) : null}
					<p className="mt-1 text-sm text-muted">
						{channel.note?.trim() || "For longer briefs or formal enquiries"}
					</p>
				</div>
				<ArrowDisc />
			</a>
		</Reveal>
	);
}

/**
 * One broadcast channel as a QR card. The whole card is one link: tap on a
 * phone opens the profile, scanning the QR from another device opens it too.
 * A scan line sweeps the code once as the card reveals and loops while it is
 * hovered. Channels without a QR (YouTube) show a large glyph plate. The
 * handle and purpose caption read as the card's figcaption.
 */
function ChannelCard({
	channel,
	icon,
	actionLabel,
	fallbackNote,
	glyph,
	wide = false,
}: Readonly<{
	channel: ContactChannel;
	/** Spans the phone grid's two columns with a letterbox plate (the odd tile out). */
	wide?: boolean;
	/** Small brand glyph beside the profile action. */
	icon: ReactNode;
	actionLabel: string;
	fallbackNote?: string;
	/** Large glyph for the plate when the channel has no QR image. */
	glyph: ReactNode;
}>) {
	const title = channel.display?.trim() || channel.label.trim() || actionLabel;
	const qr = channel.qr?.trim();
	const note = channel.note?.trim() || fallbackNote;

	return (
		<a
			href={channel.url.trim()}
			aria-label={`${channel.label.trim() || actionLabel}: ${title}`}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(linkCard, "group flex h-full flex-col p-3 sm:p-4")}
		>
			<figure className="flex h-full flex-col">
				<div
					className={cn(
						"relative overflow-hidden rounded-(--radius-md) bg-surface ring-1 ring-line",
						wide ? "aspect-[5/2] lg:aspect-square" : "aspect-square",
					)}
				>
					{qr ? (
						<>
							<Image
								src={`/${qr}`}
								alt={`QR code for ${title}`}
								width={334}
								height={384}
								sizes="(min-width: 1024px) 280px, 45vw"
								loading="lazy"
								className="absolute inset-0 h-full w-full bg-white object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
							/>
							<span aria-hidden="true" className="qr-scan" />
							<span
								aria-hidden="true"
								className="absolute right-2 bottom-2 hidden items-center gap-1 rounded-full bg-scrim/80 px-2 py-1 text-micro font-medium text-bg sm:inline-flex dark:text-ink"
							>
								<ScanLine size={12} />
								Scan
							</span>
						</>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-(--section-accent) text-bg transition-transform duration-500 group-hover:scale-105">
							{glyph}
						</div>
					)}
				</div>
				<figcaption className="mt-4 min-w-0 flex-1 px-1">
					<p className="t-display text-base leading-snug [overflow-wrap:anywhere] text-ink transition-colors group-hover:text-(--section-accent) sm:text-h3">
						{title}
					</p>
					{note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
				</figcaption>
				<p className="mt-3 inline-flex items-center gap-1.5 px-1 pb-1 text-sm font-medium text-muted transition-colors group-hover:text-ink">
					{icon}
					<span className="max-sm:sr-only">{actionLabel}</span>
					<span aria-hidden="true" className="sm:hidden">
						Open
					</span>
					<ArrowRight
						size={12}
						aria-hidden="true"
						className="shrink-0 transition-transform group-hover:translate-x-1"
					/>
				</p>
			</figure>
		</a>
	);
}

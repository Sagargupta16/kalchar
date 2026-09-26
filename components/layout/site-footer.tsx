import { Lock } from "lucide-react";
import Link from "next/link";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import { FooterReveal } from "@/components/layout/footer-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";
import "./chrome.css";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_FOR_KEY: Record<string, BrandIcon> = {
	instagram: InstagramIcon,
	youtube: YouTubeIcon,
	whatsapp: WhatsAppIcon,
	email: GmailIcon,
};

const FOOTER_LINK =
	"flex min-h-control min-w-0 items-center rounded-(--radius-sm) px-2 py-2 text-sm transition-ui hover:bg-surface hover:text-accent-text focus-visible:bg-surface active:bg-surface";

/**
 * The closing band on every public page: a deep warm-ink slab (the pigment
 * band recipe over the brand terracotta, mixed low so it reads as night) with
 * cream type. The hero line rides in word by word, the column rule draws from
 * the left, and the oversized wordmark rises out of its masks when the footer
 * scrolls into view. Links, the channel row the WhatsApp disc watches, the
 * copyright and the developer credit are all kept.
 */
export function SiteFooter() {
	const { brand, contact, developer, nav, sections } = getSite();
	const year = new Date().getFullYear();
	const heroLine = sections.hero?.title ?? brand.title;
	const channels = [
		{ key: "instagram", caption: "Art", platform: "Instagram", ...contact.instagram },
		...(contact.instagramCommunity
			? [
					{
						key: "instagram",
						caption: "Workshops",
						platform: "Instagram",
						...contact.instagramCommunity,
					},
				]
			: []),
		...(contact.youtube
			? [{ key: "youtube", caption: "YouTube", platform: undefined, ...contact.youtube }]
			: []),
		{ key: "whatsapp", caption: "WhatsApp", platform: undefined, ...contact.whatsapp },
		{ key: "email", caption: "Email", platform: undefined, ...contact.email },
	].filter((channel) => channel.url.trim());

	return (
		<footer
			className="band-pigment overflow-hidden"
			style={{ "--section-accent": "var(--color-accent)", "--band-mix": "24%" } as CSSProperties}
		>
			<Container>
				<FooterReveal>
					<div className="grid gap-10 pt-14 pb-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-12 lg:pt-20">
						<div className="min-w-0 sm:col-span-2 lg:col-span-5">
							<p className="t-eyebrow reveal-eyebrow flex items-center gap-3">
								<span aria-hidden="true" className="h-px w-8 bg-(--section-accent)" />
								{brand.tagline}
							</p>
							<p className="t-headline type-section mt-4 max-w-md">
								<KineticText text={heroLine} accentLast />
							</p>
							<p className="reveal-after mt-4 max-w-md text-sm leading-relaxed text-muted">
								{brand.description}
							</p>
							<p className="reveal-after mt-2 text-label text-muted">{brand.location}</p>
						</div>

						<nav aria-label="Footer" className="min-w-0 lg:col-span-3">
							<p className="px-2 text-label font-semibold text-ink">Explore</p>
							<ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 min-[360px]:grid-cols-3 sm:grid-cols-2">
								{nav.map((item) => (
									<li key={item.href} className="min-w-0">
										<Link
											className={cn(FOOTER_LINK, "text-ink")}
											href={item.href.startsWith("#") ? `/${item.href.slice(1)}` : item.href}
										>
											{item.label}
										</Link>
									</li>
								))}
							</ul>
						</nav>

						<div className="min-w-0 lg:col-span-4">
							<p className="px-2 text-label font-semibold text-ink">Reach out</p>
							{/* Keep the visibility sentinel used by the floating WhatsApp action. */}
							<ul
								data-channel-row=""
								className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 min-[360px]:grid-cols-3 sm:grid-cols-2"
							>
								{channels.map((channel) => {
									const Icon = ICON_FOR_KEY[channel.key];
									const handle = channel.display ?? channel.label;
									return (
										<li key={channel.url} className="min-w-0">
											<a
												className={cn(FOOTER_LINK, "h-full gap-2 text-ink")}
												href={channel.url}
												aria-label={`${channel.label}: ${handle}`}
												title={handle}
												target={channel.url.startsWith("http") ? "_blank" : undefined}
												rel={channel.url.startsWith("http") ? "noopener noreferrer" : undefined}
											>
												{Icon ? (
													<Icon className="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
												) : null}
												<span className="min-w-0 leading-4">
													<span className="block">{channel.caption}</span>
													{channel.platform ? (
														<span className="block text-xs text-muted">{channel.platform}</span>
													) : null}
												</span>
											</a>
										</li>
									);
								})}
							</ul>
						</div>
					</div>

					<div aria-hidden="true" className="footer-rule h-px bg-line" />

					{/* The closing wordmark is the footer's Home link. */}
					<Link
						href="/"
						aria-label="Home"
						className="footer-wordmark t-headline group mt-8 flex flex-wrap items-end gap-x-4 rounded-(--radius-sm) sm:mt-10"
					>
						<span className="whitespace-nowrap">
							<span className="wm-mask">
								<span
									className="wm-glyph transition-colors duration-300 group-hover:text-accent-text"
									style={{ "--g": 0 } as CSSProperties}
								>
									{brand.headline.latinPrefix}
								</span>
							</span>
							<span className="wm-mask">
								<span
									lang="hi"
									className="wm-glyph wm-dev text-accent-text"
									style={{ "--g": 1 } as CSSProperties}
								>
									{brand.headline.devanagariCore}
								</span>
							</span>
						</span>
						<span className="t-display reveal-after mb-[0.35em] text-title text-muted [--after-step:2]">
							{brand.headline.connector} {brand.headline.suffix}
						</span>
					</Link>
				</FooterReveal>

				{/* BackToTop yields while these utility links are visible. */}
				<div
					data-fab-sentinel=""
					className="mt-6 flex flex-col gap-1 border-t border-line py-4 text-xs text-muted lg:flex-row lg:items-center lg:justify-between lg:gap-4"
				>
					<p className="py-2">
						&copy; {year}{" "}
						<span>
							{brand.headline.latinPrefix}
							<span lang="hi" className="devanagari-display">
								{brand.headline.devanagariCore}
							</span>{" "}
							{brand.headline.connector} {brand.headline.suffix}
						</span>
						{". All rights reserved."}
					</p>
					<div className="flex flex-wrap items-center gap-x-2">
						<Link href="/trust" className={cn(FOOTER_LINK, "min-w-control justify-center text-xs")}>
							FAQ
						</Link>
						<Link href="/admin" className={cn(FOOTER_LINK, "gap-1.5 text-xs")}>
							<Lock size={12} aria-hidden="true" />
							Admin
						</Link>
						<span className="inline-flex min-h-control flex-wrap items-center gap-x-1">
							Developed by{" "}
							{developer ? (
								<a
									href={developer.instagram}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex min-h-control items-center rounded-(--radius-sm) underline underline-offset-2 transition-colors hover:text-accent-text"
								>
									{developer.name}
								</a>
							) : (
								"Sagar Gupta"
							)}
						</span>
					</div>
				</div>
			</Container>
		</footer>
	);
}

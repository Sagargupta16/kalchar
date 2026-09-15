import { Lock } from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_FOR_KEY: Record<string, BrandIcon> = {
	instagram: InstagramIcon,
	youtube: YouTubeIcon,
	whatsapp: WhatsAppIcon,
	email: GmailIcon,
};

const FOOTER_LINK =
	"flex min-h-control min-w-0 items-center rounded-(--radius-sm) px-2 py-2 text-sm transition-ui hover:bg-surface hover:text-accent-text focus-visible:bg-surface active:bg-surface";

export function SiteFooter() {
	const { brand, contact, developer, nav } = getSite();
	const year = new Date().getFullYear();
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
		<footer className="bg-canvas">
			<Container>
				<div className="grid gap-5 py-6 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-[1fr_1fr_1.1fr] lg:py-8">
					<Reveal
						as="div"
						eager
						delayMs={staggerDelay(0)}
						className="min-w-0 sm:col-span-2 lg:col-span-1"
					>
						<Link
							href="/"
							aria-label="Home"
							className="group inline-flex min-h-control flex-wrap items-center gap-x-2 rounded-(--radius-sm)"
						>
							<span className="t-headline text-h2 [--devanagari-shift:-0.02em]">
								<span className="transition-colors group-hover:text-accent-text">
									{brand.headline.latinPrefix}
								</span>
								<span lang="hi" className="devanagari-display text-accent">
									{brand.headline.devanagariCore}
								</span>
							</span>
							<span className="text-sm text-muted">by {brand.headline.suffix}</span>
						</Link>
						<p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{brand.tagline}</p>
						<p className="mt-1 text-label text-muted">{brand.location}</p>
					</Reveal>

					<Reveal as="div" eager delayMs={staggerDelay(1)} className="min-w-0">
						<nav aria-label="Footer">
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
					</Reveal>

					<Reveal as="div" eager delayMs={staggerDelay(2)} className="min-w-0">
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
					</Reveal>
				</div>

				{/* BackToTop yields while these utility links are visible. */}
				<div data-fab-sentinel="">
					<Reveal
						as="div"
						eager
						delayMs={staggerDelay(2)}
						className="flex flex-col gap-1 pb-6 text-xs text-muted lg:flex-row lg:items-center lg:justify-between lg:gap-4"
					>
						<p>
							&copy; {year}{" "}
							<span>
								{brand.headline.latinPrefix}
								<span lang="hi" className="devanagari-display">
									{brand.headline.devanagariCore}
								</span>{" "}
								{brand.headline.connector} {brand.headline.suffix}
							</span>
							. All rights reserved.
						</p>
						<div className="flex flex-wrap items-center gap-x-2">
							<Link
								href="/trust"
								className={cn(FOOTER_LINK, "min-w-control justify-center text-xs")}
							>
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
					</Reveal>
				</div>
			</Container>
		</footer>
	);
}

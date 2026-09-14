import {
	Brush,
	CalendarDays,
	Frame,
	Lock,
	type LucideIcon,
	Mail,
	Palette,
	Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import { PigmentWash } from "@/components/decor/pigment-wash";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
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

// Nav glyphs keyed by the href slug (stable; label text can be reworded).
// Falls back to a neutral dot when a new nav item has no mapping yet.
const NAV_ICON: Record<string, LucideIcon> = {
	work: Frame,
	events: CalendarDays,
	about: Palette,
	workshops: Users,
	"custom-orders": Brush,
	contact: Mail,
};

/** Underline draw for the bottom-bar text links (motion addendum C7): a 1px
 *  line grows from the left on hover/focus; inherits fast/ease-out. The tween
 *  is motion-safe gated so the line appears instantly under reduced motion
 *  (C7 RM clause): the reduced block kills only bare .transition-transform,
 *  and the after: variant compiles to a class it never matches. */
const DRAW_UNDERLINE =
	"after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-current after:origin-left after:scale-x-0 motion-safe:after:transition-transform hover:after:scale-x-100 focus-visible:after:scale-x-100";

function navKey(href: string): string {
	return href.replace(/^[#/]+/, "");
}

export function SiteFooter() {
	const { brand, contact, developer, nav } = getSite();
	const year = new Date().getFullYear();

	// Each channel carries its own pigment (the same section-pigment system used
	// across the site), surfaced on hover so every contact method reads as its
	// own thing rather than a flat list. Value is a CSS var -> no raw hex.
	const channels = [
		{ key: "instagram", tint: "var(--color-accent)", caption: "Art", ...contact.instagram },
		...(contact.instagramCommunity
			? [
					{
						key: "instagram",
						tint: "var(--color-peacock)",
						caption: "Workshops",
						...contact.instagramCommunity,
					},
				]
			: []),
		...(contact.youtube
			? [{ key: "youtube", tint: "var(--color-ruby)", caption: "YouTube", ...contact.youtube }]
			: []),
		{ key: "whatsapp", tint: "var(--color-pichwai)", caption: "WhatsApp", ...contact.whatsapp },
		{ key: "email", tint: "var(--color-marigold)", caption: "Email", ...contact.email },
	];

	return (
		<footer className="relative overflow-hidden border-t border-line bg-canvas [contain:paint]">
			{/* Colophon seam -- the hairline fades through gold at the centre
			    (visual-direction 2.13; the museum's one full-width gold moment). */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--color-gold-hairline) to-transparent"
			/>

			{/* Static pigment wash for warmth (drift=false: nothing loops in the footer). */}
			<PigmentWash drift={false} />

			<Container className="relative z-raised">
				{/* ── Top: colophon + links + channels ── */}
				<div className="grid gap-10 py-14 sm:grid-cols-2 sm:py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
					{/* Brand colophon: her name set at display size on paper (2.13). */}
					<Reveal as="div" delayMs={staggerDelay(0)} className="sm:col-span-2 lg:col-span-6">
						<Link
							href="/"
							aria-label="Home"
							className="group inline-flex min-h-control flex-wrap items-baseline gap-x-3 gap-y-1"
						>
							{/* Display-size wordmark tunes the Devanagari baseline locally (1.1).
							    Steering 2026-09-14: one rung under the hero (display-sm, 40/56px)
							    so the colophon no longer restates the hero's display rung. */}
							<span className="t-headline text-display-sm [--devanagari-shift:-0.02em]">
								<span className="transition-colors group-hover:text-accent-text">
									{brand.headline.latinPrefix}
								</span>
								<span lang="hi" className="devanagari-display text-accent">
									{brand.headline.devanagariCore}
								</span>
							</span>
							<span className="text-sm text-muted">by {brand.headline.suffix}</span>
						</Link>
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{brand.tagline}</p>
						<p className="t-meta mt-3 inline-flex items-center gap-1.5">
							<span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-accent" />
							{brand.location}
						</p>
					</Reveal>

					{/* Explore -- the numbered wall list (2.13): tabular indices beside
					    the kept icon pellets, 44px rows, the doormat nav for a ten-section
					    home page. */}
					<Reveal as="div" delayMs={staggerDelay(1)} className="lg:col-span-3">
						<nav aria-label="Footer">
							<p className="t-eyebrow flex items-center gap-2">
								<AccentRule />
								Explore
							</p>
							<ul className="mt-5 space-y-1">
								{nav.map((item, index) => {
									const Icon = NAV_ICON[navKey(item.href)];
									return (
										<li key={item.href}>
											<Link
												className="group -mx-2 flex min-h-control items-center gap-3 rounded-(--radius-sm) px-2 py-2 text-sm text-ink transition-colors hover:bg-surface/60 active:bg-surface/60"
												href={item.href.startsWith("#") ? `/${item.href.slice(1)}` : item.href}
											>
												<span aria-hidden="true" className="t-meta w-5 shrink-0 tabular-nums">
													{String(index + 1).padStart(2, "0")}
												</span>
												<IconCircle
													size="xs"
													className="bg-surface text-muted group-hover:text-accent-text group-hover:ring-accent/60"
												>
													{Icon ? (
														<Icon size={16} aria-hidden="true" />
													) : (
														<span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
													)}
												</IconCircle>
												<span className="transition-colors group-hover:text-accent-text">
													{item.label}
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>
					</Reveal>

					{/* Reach out -- pigment pellets. On phones each channel is a 44px
					    row (pellet, caption, then the actual handle or number) so
					    "Art" and "Workshops" say which account opens without a hover;
					    from sm the pellets wrap with a hover/focus tooltip. */}
					<Reveal as="div" delayMs={staggerDelay(2)} className="lg:col-span-3">
						<p className="t-eyebrow flex items-center gap-2">
							<AccentRule />
							Reach out
						</p>
						{/* data-channel-row: the floating WhatsApp disc hides while this
						    block is in view (visual-direction 2.14). */}
						<ul
							data-channel-row=""
							className="mt-5 grid gap-1 sm:flex sm:max-w-[19rem] sm:flex-wrap sm:gap-x-5 sm:gap-y-4"
						>
							{channels.map((c) => {
								const Icon = ICON_FOR_KEY[c.key];
								const handle = c.display ?? c.label;
								return (
									<li key={c.url} style={{ "--ch-accent": c.tint } as CSSProperties}>
										<a
											className="group -mx-2 flex min-h-control items-center gap-3 rounded-(--radius-sm) px-2 py-1 text-muted transition-colors hover:text-(--ch-accent) focus-visible:text-(--ch-accent) active:bg-surface/60 sm:mx-0 sm:flex-col sm:items-center sm:gap-2 sm:px-0 sm:py-0"
											href={c.url}
											aria-label={`${c.label}: ${handle}`}
											title={handle}
											target={c.url.startsWith("http") ? "_blank" : undefined}
											rel={c.url.startsWith("http") ? "noopener noreferrer" : undefined}
										>
											<IconCircle
												size="md"
												className="relative bg-surface text-current pressable group-hover:-translate-y-0.5 group-hover:ring-(--ch-accent)/60 group-hover:shadow-e1"
											>
												{Icon ? <Icon className="size-5" aria-hidden="true" /> : null}
												{/* Tooltip: full handle on hover/focus from sm up (phones read the handle inline below). */}
												<span
													aria-hidden="true"
													className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-(--radius-sm) bg-scrim px-2 py-1 text-micro font-medium tracking-normal text-bg opacity-0 transition-[opacity,translate] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:block dark:text-ink"
												>
													{handle}
												</span>
											</IconCircle>
											<span className="flex min-w-0 flex-col sm:items-center">
												<span className="text-micro font-medium uppercase tracking-meta">
													{c.caption}
												</span>
												<span className="truncate text-xs normal-case tracking-normal text-muted sm:hidden">
													{handle}
												</span>
											</span>
										</a>
									</li>
								);
							})}
						</ul>
					</Reveal>
				</div>

				{/* ── Bottom bar ── centered + stacked on mobile, split on desktop.
				    `eager` (CSS reveal, not whileInView): this sits at the very page
				    bottom where the in-view trigger can fail to fire and leave it
				    stuck at opacity:0. The wrapper div is the sentinel BackToTop
				    observes to yield these links (Reveal forwards no data-* props). ── */}
				<div data-fab-sentinel="">
					<Reveal
						as="div"
						eager
						delayMs={staggerDelay(2)}
						className="t-meta flex flex-col items-center gap-3 border-t border-(--color-gold-hairline) pt-6 pb-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
					>
						<p>
							&copy; {year}{" "}
							<span className="normal-case">
								{brand.headline.latinPrefix}
								<span lang="hi" className="devanagari-display">
									{brand.headline.devanagariCore}
								</span>{" "}
								{brand.headline.connector} {brand.headline.suffix}
							</span>
							. All rights reserved.
						</p>
						<div className="flex items-center gap-3">
							<Link
								href="/trust"
								className={cn(
									"relative inline-flex min-h-control min-w-control items-center justify-center transition-colors hover:text-accent-text",
									DRAW_UNDERLINE,
								)}
							>
								FAQ
							</Link>
							<span aria-hidden="true" className="h-3 w-px bg-line" />
							<Link
								href="/admin"
								className={cn(
									"relative inline-flex min-h-control items-center gap-1.5 transition-colors hover:text-accent-text",
									DRAW_UNDERLINE,
								)}
							>
								<Lock size={12} aria-hidden="true" />
								Admin
							</Link>
							<span aria-hidden="true" className="h-3 w-px bg-line" />
							<span>
								Developed by{" "}
								{developer ? (
									<a
										href={developer.instagram}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex min-h-control items-center underline decoration-line/50 underline-offset-3 transition-colors hover:text-accent-text hover:decoration-accent"
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

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
import { Reveal } from "@/components/motion/reveal";
import { GmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { getSite } from "@/lib/data";

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
		<footer className="relative mt-24 overflow-hidden border-t border-line bg-bg-soft">
			{/* Artistic top rule -- a hairline that fades through accent, replacing
			    the flat border for a more crafted seam (decorative). */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
			/>

			{/* Soft pigment washes for warmth -- one top-left, one bottom-right. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/8 blur-3xl"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-accent-soft/8 blur-3xl"
			/>

			<div className="relative z-10 mx-auto max-w-6xl px-(--container-px)">
				{/* ── Top: links + channels ── */}
				<div className="grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] md:gap-16 sm:py-16">
					{/* Brand */}
					<Reveal as="div" delayMs={0} className="sm:col-span-2 md:col-span-1">
						<Link href="/" aria-label="Home" className="group inline-flex items-baseline gap-2">
							<span className="t-display text-3xl leading-none tracking-[var(--tracking-tight)] sm:text-[2rem]">
								<span className="not-italic transition-colors duration-(--duration-base) ease-(--ease-out) group-hover:text-accent">
									{brand.headline.latinPrefix}
								</span>
								<span lang="hi" className="font-devanagari not-italic text-accent">
									{brand.headline.devanagariCore}
								</span>
							</span>
							<span className="text-sm text-muted">by {brand.headline.suffix}</span>
						</Link>
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{brand.tagline}</p>
						<p className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-[var(--tracking-meta)] text-muted">
							<span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-accent" />
							{brand.location}
						</p>
					</Reveal>

					{/* Explore -- icon-led index. Each row is a self-contained chip
					    (icon pellet + label) so the list reads as a structured menu
					    rather than a sparse column, and rhymes with Reach out. */}
					<Reveal as="div" delayMs={80}>
						<nav aria-label="Footer">
							<p className="t-eyebrow">Explore</p>
							<ul className="mt-5 space-y-1">
								{nav.map((item) => {
									const Icon = NAV_ICON[navKey(item.href)];
									return (
										<li key={item.href}>
											<Link
												className="group -mx-2 flex items-center gap-3 rounded-(--radius-md) px-2 py-2 text-sm text-ink transition-colors duration-(--duration-base) ease-(--ease-out) hover:bg-bg/60"
												href={item.href.startsWith("#") ? `/${item.href.slice(1)}` : item.href}
											>
												<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg-soft text-muted ring-1 ring-line transition-colors duration-(--duration-base) ease-(--ease-out) group-hover:text-accent group-hover:ring-accent/60">
													{Icon ? (
														<Icon size={15} aria-hidden="true" />
													) : (
														<span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
													)}
												</span>
												<span className="transition-colors duration-(--duration-base) ease-(--ease-out) group-hover:text-accent">
													{item.label}
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>
					</Reveal>

					{/* Reach out -- pigment pellets with an always-visible caption. The
					    caption (Art / Workshops / WhatsApp / Email) is what tells the two
					    Instagram channels apart without a hover, which phones don't have.
					    The full handle still surfaces in a hover/focus tooltip + aria-label. */}
					<Reveal as="div" delayMs={160}>
						<p className="t-eyebrow">Reach out</p>
						<ul className="mt-5 flex flex-wrap gap-x-5 gap-y-4">
							{channels.map((c) => {
								const Icon = ICON_FOR_KEY[c.key];
								const handle = c.display ?? c.label;
								return (
									<li key={c.url} style={{ "--ch-accent": c.tint } as CSSProperties}>
										<a
											className="group flex flex-col items-center gap-2 text-muted transition-colors duration-(--duration-base) ease-(--ease-out) hover:text-(--ch-accent) focus-visible:text-(--ch-accent)"
											href={c.url}
											aria-label={`${c.label}: ${handle}`}
											target={c.url.startsWith("http") ? "_blank" : undefined}
											rel={c.url.startsWith("http") ? "noopener noreferrer" : undefined}
										>
											<span className="relative grid h-12 w-12 place-items-center rounded-full border border-line bg-bg/60 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:-translate-y-0.5 group-hover:border-(--ch-accent)/60 group-hover:shadow-e1">
												{Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
												{/* Tooltip -- full handle on hover/focus (pointer + keyboard). */}
												<span
													aria-hidden="true"
													className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-(--radius-sm) bg-ink px-2 py-1 text-[0.6875rem] font-medium tracking-normal text-bg opacity-0 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
												>
													{handle}
												</span>
											</span>
											<span className="text-[0.6875rem] font-medium uppercase tracking-[var(--tracking-meta)]">
												{c.caption}
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
				    stuck at opacity:0. Eager renders it visible on mount. ── */}
				<Reveal
					as="div"
					eager
					delayMs={120}
					className="flex flex-col items-center gap-3 border-t border-line/70 pt-6 pb-24 text-center text-xs uppercase tracking-[var(--tracking-meta)] text-muted sm:flex-row sm:items-center sm:justify-between sm:pb-6 sm:text-left"
				>
					<p>
						&copy; {year} {brand.title}. All rights reserved.
					</p>
					<div className="flex items-center gap-3">
						<Link href="/trust" className="transition-colors hover:text-accent">
							FAQ
						</Link>
						<span aria-hidden="true" className="h-3 w-px bg-line" />
						<Link
							href="/admin"
							className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
						>
							<Lock size={11} aria-hidden="true" />
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
									className="underline underline-offset-3 decoration-line/50 transition-colors hover:text-accent hover:decoration-accent"
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
		</footer>
	);
}

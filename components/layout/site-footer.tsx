import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { GmailIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { getSite } from "@/lib/data";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_FOR_KEY: Record<string, BrandIcon> = {
	instagram: InstagramIcon,
	whatsapp: WhatsAppIcon,
	email: GmailIcon,
};

export function SiteFooter() {
	const { brand, contact, developer, nav } = getSite();
	const year = new Date().getFullYear();

	const channels = [
		{ key: "instagram", ...contact.instagram },
		...(contact.instagramCommunity ? [{ key: "instagram", ...contact.instagramCommunity }] : []),
		{ key: "whatsapp", ...contact.whatsapp },
		{ key: "email", ...contact.email },
	];

	return (
		<footer className="relative mt-24 overflow-hidden border-t border-line bg-bg-soft">
			{/* Soft pigment glow top-left, for warmth (decorative). */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/8 blur-3xl"
			/>

			<div className="relative mx-auto max-w-6xl px-(--container-px)">
				{/* ── Top: links + channels ── */}
				<div className="grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] md:gap-16 sm:py-16">
					{/* Brand */}
					<div className="sm:col-span-2 md:col-span-1">
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
						<p className="mt-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-[var(--tracking-meta)] text-muted">
							<span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-accent" />
							{brand.location}
						</p>
					</div>

					{/* Explore */}
					<nav aria-label="Footer">
						<p className="t-eyebrow">Explore</p>
						<ul className="mt-5 space-y-3 text-sm">
							{nav.map((item) => (
								<li key={item.href}>
									<Link
										className="group inline-flex items-center gap-2 text-ink transition-colors hover:text-accent"
										href={item.href.startsWith("#") ? `/${item.href.slice(1)}` : item.href}
									>
										<span
											aria-hidden="true"
											className="inline-block h-px w-0 bg-accent transition-all duration-(--duration-base) ease-(--ease-out) group-hover:w-4"
										/>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Reach out */}
					<div className="min-w-0 md:min-w-56">
						<p className="t-eyebrow">Reach out</p>
						<ul className="mt-5 space-y-2">
							{channels.map((c) => {
								const Icon = ICON_FOR_KEY[c.key];
								return (
									<li key={c.url}>
										<a
											className="group -mx-2 flex items-center gap-3 rounded-(--radius-sm) px-2 py-2 text-sm text-ink transition-colors hover:bg-bg"
											href={c.url}
											target={c.url.startsWith("http") ? "_blank" : undefined}
											rel={c.url.startsWith("http") ? "noopener noreferrer" : undefined}
										>
											{Icon ? (
												<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg text-muted ring-1 ring-line transition-colors group-hover:text-accent group-hover:ring-accent">
													<Icon className="h-4 w-4" aria-hidden="true" />
												</span>
											) : null}
											<span className="min-w-0 flex-1 truncate transition-colors group-hover:text-accent">
												{c.display ?? c.label}
											</span>
											<ArrowUpRight
												size={14}
												aria-hidden="true"
												className="shrink-0 -translate-x-1 text-muted opacity-0 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-0 group-hover:opacity-100"
											/>
										</a>
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				{/* ── Bottom bar ── */}
				<div className="flex flex-col gap-3 border-t border-line/70 py-6 text-xs uppercase tracking-[var(--tracking-meta)] text-muted sm:flex-row sm:items-center sm:justify-between">
					<p>
						&copy; {year} {brand.title}. All rights reserved.
					</p>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<Link
							href="/admin"
							className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
						>
							<Lock size={11} aria-hidden="true" />
							Admin
						</Link>
						<span aria-hidden="true" className="hidden h-3 w-px bg-line sm:inline-block" />
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
						<span aria-hidden="true" className="hidden h-3 w-px bg-line sm:inline-block" />
						<a
							href="#main"
							className="group inline-flex items-center gap-1.5 transition-colors hover:text-accent"
						>
							Back to top
							<ArrowUpRight
								size={12}
								aria-hidden="true"
								className="rotate-[-45deg] transition-transform group-hover:-translate-y-0.5"
							/>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

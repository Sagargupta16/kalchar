import { Lock } from "lucide-react";
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
		<footer className="mt-24 border-t border-line">
			<div className="mx-auto grid max-w-6xl gap-10 px-(--container-px) py-14 sm:grid-cols-3 sm:gap-8">
				{/* Brand column */}
				<div>
					<Link
						href="/"
						className="t-display inline-block text-2xl leading-none transition-colors hover:text-accent"
					>
						<span className="not-italic">{brand.headline.latinPrefix}</span>
						<span lang="hi" className="font-devanagari not-italic text-accent">
							{brand.headline.devanagariCore}
						</span>
					</Link>
					<p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{brand.tagline}</p>
					<p className="mt-1.5 text-xs uppercase tracking-[var(--tracking-meta)] text-muted">
						{brand.location}
					</p>
					{/* Artist personal IG */}
					{contact.instagramPersonal ? (
						<a
							href={contact.instagramPersonal.url}
							target="_blank"
							rel="noopener noreferrer"
							className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
						>
							<InstagramIcon className="h-3.5 w-3.5" aria-hidden="true" />
							{contact.instagramPersonal.display}
						</a>
					) : null}
				</div>

				{/* Navigate column */}
				<nav aria-label="Footer">
					<p className="t-eyebrow">Navigate</p>
					<ul className="mt-4 space-y-2.5 text-sm">
						{nav.map((item) => (
							<li key={item.href}>
								<Link
									className="text-ink transition-colors hover:text-accent"
									href={item.href.startsWith("#") ? `/${item.href.slice(1)}` : item.href}
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				{/* Contact column */}
				<div>
					<p className="t-eyebrow">Reach out</p>
					<ul className="mt-4 space-y-2.5 text-sm">
						{channels.map((c) => {
							const Icon = ICON_FOR_KEY[c.key];
							return (
								<li key={c.url}>
									<a
										className="inline-flex items-center gap-2 text-ink transition-colors hover:text-accent"
										href={c.url}
										target={c.url.startsWith("http") ? "_blank" : undefined}
										rel={c.url.startsWith("http") ? "noopener noreferrer" : undefined}
									>
										{Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
										<span>{c.display ?? c.label}</span>
									</a>
								</li>
							);
						})}
					</ul>
				</div>
			</div>

			{/* Bottom bar */}
			<div className="border-t border-line">
				<div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-(--container-px) py-5 text-xs uppercase tracking-[var(--tracking-meta)] text-muted sm:flex-row sm:items-center">
					<p>
						&copy; {year} {brand.title}. All rights reserved.
					</p>
					<div className="flex items-center gap-4">
						<Link
							href="/admin"
							className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
						>
							<Lock size={11} aria-hidden="true" />
							Admin
						</Link>
						{developer ? (
							<a
								href={developer.instagram}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
							>
								<span>Developed by {developer.name}</span>
								<InstagramIcon className="h-3 w-3" aria-hidden="true" />
							</a>
						) : (
							<span>Site by Sagar Gupta</span>
						)}
					</div>
				</div>
			</div>
		</footer>
	);
}

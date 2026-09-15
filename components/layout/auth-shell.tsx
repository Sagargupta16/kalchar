import Link from "next/link";
import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";

interface AuthShellProps {
	/** Small tracked label above the title ("Admin access"). */
	eyebrow?: string;
	title: string;
	lead: string;
	/** Optional glyph between the lockup and the title (the lock on /access-denied). */
	icon?: ReactNode;
	children: ReactNode;
}

/**
 * Shared frame for /login and /access-denied (visual-direction 2.11): a
 * single centred column capped at 28rem, sized to its content, the
 * h1 in the roman headline voice at the title rung (utility pages; the
 * display-sm rung would shout), and one carded sheet with the page's single
 * action area. The sheet sits on the iOS
 * material (material-glass, steering 2026-09-14): token tint, static blur,
 * and the hairline + e2 elevation in one box-shadow list, falling back to an
 * opaque surface where backdrop-filter is unsupported. No wash, no motifs
 * on these pages: they precede the admin, so they stay quiet. The
 * site header and footer render around these routes (HideOnAdmin only hides
 * on /admin), so the column follows the section rhythm instead of claiming a
 * full viewport. Server component: reads the brand lockup from site.json.
 */
export function AuthShell({ eyebrow, title, lead, icon, children }: Readonly<AuthShellProps>) {
	const { brand } = getSite();
	return (
		<main>
			<Section padded size="narrow" containerClassName="py-(--space-block)">
				<div className="mx-auto flex w-full max-w-md flex-col text-center">
					<Link
						href="/"
						className="t-display mx-auto inline-block text-3xl leading-none transition-colors hover:text-accent-text"
					>
						<span className="not-italic">{brand.headline.latinPrefix}</span>
						<span lang="hi" className="devanagari-display not-italic text-accent">
							{brand.headline.devanagariCore}
						</span>
					</Link>
					{icon ? <div className="mt-6 flex justify-center">{icon}</div> : null}
					{eyebrow ? <p className="t-eyebrow mt-6">{eyebrow}</p> : null}
					<h1 className={cn("t-headline text-title", eyebrow ? "mt-3" : "mt-6")}>{title}</h1>
					<p className="t-lead mt-3">{lead}</p>
					{/* The auth foreground sheet on the glass material: the utility
					    carries its own hairline + e2 elevation (one box-shadow list, so
					    no border or shadow-* utility may stack on it) and stays fully
					    opaque without backdrop-filter support. */}
					<div
						data-slot="auth-card"
						className="material-glass mt-6 rounded-(--radius-md) p-(--card-pad-lg)"
					>
						{children}
					</div>
				</div>
			</Section>
		</main>
	);
}

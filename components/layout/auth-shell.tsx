import Link from "next/link";
import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";

interface AuthShellProps {
	title: string;
	lead: string;
	/** Optional glyph between the lockup and the title (the lock on /access-denied). */
	icon?: ReactNode;
	children: ReactNode;
}

/**
 * Shared frame for /login and /access-denied. The site header and footer render
 * around these routes (HideOnAdmin only hides on /admin), so the column follows
 * the section rhythm instead of claiming a full viewport with min-h-dvh.
 * Server component: reads the brand lockup from site.json.
 */
export function AuthShell({ title, lead, icon, children }: Readonly<AuthShellProps>) {
	const { brand } = getSite();
	return (
		<main>
			<Section padded size="narrow">
				<div className="mx-auto w-full max-w-md text-center">
					<Link
						href="/"
						className="t-display inline-block text-3xl leading-none transition-colors hover:text-accent-text"
					>
						<span className="not-italic">{brand.headline.latinPrefix}</span>
						<span lang="hi" className="devanagari-display not-italic text-accent">
							{brand.headline.devanagariCore}
						</span>
					</Link>
					{icon ? <div className="mt-10 flex justify-center">{icon}</div> : null}
					<h1 className={cn("t-display text-title", icon ? "mt-6" : "mt-8")}>{title}</h1>
					<p className="t-lead mt-3">{lead}</p>
					{children}
				</div>
			</Section>
		</main>
	);
}

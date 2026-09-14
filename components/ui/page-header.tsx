import type { ReactNode } from "react";
import { KachniRule } from "@/components/decor/kachni-rule";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	eyebrow: string;
	title: string;
	lead?: string;
	children?: ReactNode;
	className?: string;
	centered?: boolean;
	/** Short kachni rule under the eyebrow (the standard Tier 2 header; /work opts out). */
	kachni?: boolean;
}

/**
 * The shared public page h1 (visual-direction 2.12): eyebrow, optional short
 * kachni rule, the title in the roman headline voice at the display-sm rung
 * (40px at 390, 56px at 1280 since the 2026-09-14 steering retune), a gold
 * hairline drawn under it, then the lead.
 * Internal rhythm per 2.0: eyebrow to h1 12px, h1 to rule 20px, rule to lead
 * 16px.
 */
export function PageHeader({
	eyebrow,
	title,
	lead,
	children,
	className,
	centered = false,
	kachni = false,
}: Readonly<PageHeaderProps>) {
	return (
		<header
			className={cn("relative max-w-(--header-max)", centered && "mx-auto text-center", className)}
		>
			<Reveal>
				<p className="t-eyebrow flex items-center gap-2">
					<AccentRule />
					{eyebrow}
				</p>
				{kachni ? <KachniRule form="short" className={cn("mt-2", centered && "mx-auto")} /> : null}
			</Reveal>
			<Reveal eager delayMs={staggerDelay(1)} as="h1" className="t-headline mt-3 text-display-sm">
				{title}
			</Reveal>
			<AccentRule variant="gold" className="mt-5 w-12" />
			{lead ? (
				<Reveal eager delayMs={staggerDelay(2)}>
					<p className="t-lead mt-4">{lead}</p>
				</Reveal>
			) : null}
			{children}
		</header>
	);
}

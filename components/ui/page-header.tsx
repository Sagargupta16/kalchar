import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	eyebrow: string;
	title: string;
	lead?: string;
	children?: ReactNode;
	className?: string;
	centered?: boolean;
}

/**
 * Public page heading with a simple eyebrow. Shares the
 * 12px title gap and 16px lead gap with SectionHeader and SkeletonHeader.
 */
export function PageHeader({
	eyebrow,
	title,
	lead,
	children,
	className,
	centered = false,
}: Readonly<PageHeaderProps>) {
	return (
		<header
			className={cn("relative max-w-(--header-max)", centered && "mx-auto text-center", className)}
		>
			<Reveal>
				<p className="t-eyebrow">{eyebrow}</p>
			</Reveal>
			<Reveal eager delayMs={staggerDelay(1)} as="h1" className="t-headline mt-3 text-h1">
				{title}
			</Reveal>
			{lead ? (
				<Reveal eager delayMs={staggerDelay(2)}>
					<p className="t-lead mt-4">{lead}</p>
				</Reveal>
			) : null}
			{children}
		</header>
	);
}

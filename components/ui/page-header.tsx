import type { ReactNode } from "react";
import { KineticText } from "@/components/motion/kinetic-text";
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
 * Public page heading. Shares the 12px title gap and 16px lead gap with
 * SectionHeader and SkeletonHeader. It enters on paint with the hero's
 * language: the eyebrow slides in, every title word rides up out of its mask
 * (CSS only, so the h1 text is in the server HTML and never waits for JS),
 * then the lead rises.
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
			<p
				className={cn(
					"t-eyebrow eyebrow-eager flex items-center gap-3",
					centered && "justify-center",
				)}
			>
				<span
					aria-hidden="true"
					className={cn("h-px w-8 bg-(--section-accent)", centered && "hidden")}
				/>
				{eyebrow}
			</p>
			<h1 className="t-headline type-page kinetic-eager mt-3">
				<KineticText text={title} startIndex={1} />
			</h1>
			{lead ? (
				<Reveal eager delayMs={staggerDelay(5)}>
					<p className="t-lead mt-4">{lead}</p>
				</Reveal>
			) : null}
			{children}
		</header>
	);
}

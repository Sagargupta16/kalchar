"use client";

import type { CSSProperties, ReactNode } from "react";
import { KineticText } from "@/components/motion/kinetic-text";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
	eyebrow: string;
	title: string;
	lead?: string;
	/** h2 on the home page, h1 is PageHeader's job. */
	as?: "h2" | "h3";
	centered?: boolean;
	/** Right-aligned slot (e.g. "View all" link) on sm+; stacks under the lead on phones. */
	action?: ReactNode;
	className?: string;
}

/**
 * Section heading that enters as one choreography when it scrolls in: the
 * eyebrow slides in from the left, every title word rides up out of its mask
 * (the hero's technique), then the lead and action rise 44px after the title
 * has mostly landed. Headers already on screen at mount stay static. The
 * copy is always in the server HTML; only transform and opacity animate.
 */
export function SectionHeader({
	eyebrow,
	title,
	lead,
	as: Heading = "h2",
	centered = false,
	action,
	className,
}: Readonly<SectionHeaderProps>) {
	const [ref, state] = useViewReveal<HTMLElement>();
	const words = title.trim().split(/\s+/).length;
	const after = { "--after-step": Math.min(words, 6) } as CSSProperties;
	return (
		<header
			ref={ref}
			data-motion-reveal
			data-reveal={state}
			className={cn(
				"flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				centered && "text-center sm:flex-col sm:items-center",
				className,
			)}
		>
			<div className={cn("max-w-(--header-max)", centered && "mx-auto")}>
				<p className="t-eyebrow reveal-eyebrow flex items-center gap-3">
					<span
						aria-hidden="true"
						className={cn("h-px w-8 bg-(--section-accent)", centered && "hidden")}
					/>
					{eyebrow}
				</p>
				<Heading className="t-headline type-section mt-3">
					<KineticText text={title} />
				</Heading>
				{lead ? (
					<p className="t-lead reveal-after mt-4" style={after}>
						{lead}
					</p>
				) : null}
			</div>
			{action ? (
				<div className="reveal-after shrink-0" style={after}>
					{action}
				</div>
			) : null}
		</header>
	);
}

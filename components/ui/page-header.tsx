import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	eyebrow: string;
	title: string;
	lead?: string;
	children?: ReactNode;
	className?: string;
	centered?: boolean;
}

export function PageHeader({
	eyebrow,
	title,
	lead,
	children,
	className,
	centered = false,
}: Readonly<PageHeaderProps>) {
	return (
		<header className={cn("relative max-w-2xl", centered && "mx-auto text-center", className)}>
			<Reveal>
				<p className="t-eyebrow flex items-center gap-2">
					<AccentRule />
					{eyebrow}
				</p>
			</Reveal>
			<Reveal eager delayMs={80} as="h1" className="t-display mt-3 text-4xl sm:text-5xl">
				{title}
			</Reveal>
			{lead ? (
				<Reveal eager delayMs={160}>
					<p className="t-lead mt-4">{lead}</p>
				</Reveal>
			) : null}
			{children}
		</header>
	);
}

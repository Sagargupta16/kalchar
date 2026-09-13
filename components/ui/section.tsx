import type { CSSProperties, ReactNode } from "react";
import { AccentRule } from "@/components/ui/accent-rule";
import { Container, type ContainerSize } from "@/components/ui/container";
import { cn } from "@/lib/utils";

type SectionAccent = "accent" | "marigold" | "pichwai" | "vermillion" | "peacock" | "ruby";
type SectionBackground = "default" | "canvas" | "muted" | "soft";

const ACCENT_MAP: Record<SectionAccent, string> = {
	accent: "var(--color-accent)",
	marigold: "var(--color-marigold)",
	pichwai: "var(--color-pichwai)",
	vermillion: "var(--color-vermillion)",
	peacock: "var(--color-peacock)",
	ruby: "var(--color-ruby)",
};

/** `soft` is a deprecated alias of `canvas`; integration deletes it. */
const BG_MAP: Record<SectionBackground, string> = {
	default: "bg-bg",
	canvas: "bg-canvas",
	soft: "bg-canvas",
	muted: "bg-bg-muted",
};

interface SectionProps {
	accent?: SectionAccent;
	background?: SectionBackground;
	/** Wrap children in <Container> with the section rhythm (py-(--section-py)). */
	padded?: boolean;
	size?: ContainerSize;
	containerClassName?: string;
	id?: string;
	borderTop?: boolean;
	borderBottom?: boolean;
	className?: string;
	children: ReactNode;
}

export function Section({
	accent = "accent",
	background = "default",
	padded = false,
	size = "default",
	containerClassName,
	id,
	borderTop = false,
	borderBottom = false,
	className,
	children,
}: Readonly<SectionProps>) {
	const style = { "--section-accent": ACCENT_MAP[accent] } as CSSProperties;
	return (
		<section
			id={id}
			style={style}
			className={cn(
				BG_MAP[background],
				borderTop && "border-t border-line",
				borderBottom && "border-b border-line",
				className,
			)}
		>
			{padded ? (
				<Container size={size} className={cn("py-(--section-py)", containerClassName)}>
					{children}
				</Container>
			) : (
				children
			)}
		</section>
	);
}

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
 * Eyebrow + display heading + optional lead, sized from the header token.
 * Does NOT wrap in Reveal: the eager CSS reveal belongs to the caller.
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
	return (
		<header
			className={cn(
				"flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
				centered && "text-center sm:flex-col sm:items-center",
				className,
			)}
		>
			<div className={cn("max-w-(--header-max)", centered && "mx-auto")}>
				<p className={cn("t-eyebrow flex items-center gap-2", centered && "justify-center")}>
					<AccentRule />
					{eyebrow}
					{/* Centered headers keep today's flanking rules (public-home About teaser). */}
					{centered ? <AccentRule /> : null}
				</p>
				<Heading className="t-display mt-3 text-h2">{title}</Heading>
				{lead ? <p className="t-lead mt-4">{lead}</p> : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}

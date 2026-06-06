"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionAccent = "accent" | "marigold" | "pichwai" | "vermillion" | "peacock" | "ruby";

const ACCENT_MAP: Record<SectionAccent, string> = {
	accent: "var(--color-accent)",
	marigold: "var(--color-marigold)",
	pichwai: "var(--color-pichwai)",
	vermillion: "var(--color-vermillion)",
	peacock: "var(--color-peacock)",
	ruby: "var(--color-ruby)",
};

interface SectionProps {
	accent?: SectionAccent;
	background?: "default" | "soft" | "muted";
	className?: string;
	children: ReactNode;
	id?: string;
	borderTop?: boolean;
	borderBottom?: boolean;
}

const BG_MAP = {
	default: "bg-bg",
	soft: "bg-bg-soft",
	muted: "bg-bg-muted",
};

export function Section({
	accent = "accent",
	background = "default",
	className,
	children,
	id,
	borderTop = false,
	borderBottom = false,
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
			{children}
		</section>
	);
}

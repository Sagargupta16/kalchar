import type { CSSProperties, ReactNode } from "react";
import { PigmentWash } from "@/components/decor/pigment-wash";
import { Container, type ContainerSize } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export { SectionHeader } from "./section-header";

type SectionAccent = "accent" | "marigold" | "pichwai" | "vermillion" | "peacock" | "ruby";
type SectionBackground = "default" | "canvas" | "muted" | "soft" | "wash" | "pigment";

const ACCENT_MAP: Record<SectionAccent, string> = {
	accent: "var(--color-accent)",
	marigold: "var(--color-marigold)",
	pichwai: "var(--color-pichwai)",
	vermillion: "var(--color-vermillion)",
	peacock: "var(--color-peacock)",
	ruby: "var(--color-ruby)",
};

/** `soft` is a deprecated alias of `canvas`; integration deletes it. `wash` is
 * the flat pigment band (--section-wash) for page headers and closing CTAs.
 * `pigment` is the bold full-bleed band: a deep version of the section accent
 * with cream type, every semantic token remapped inside (pigment-band.css). */
const BG_MAP: Record<SectionBackground, string> = {
	default: "bg-bg",
	canvas: "bg-canvas",
	soft: "bg-canvas",
	muted: "bg-bg-muted",
	wash: "bg-(--section-wash)",
	pigment: "band-pigment",
};

interface SectionProps {
	accent?: SectionAccent;
	background?: SectionBackground;
	/** Wrap children in <Container> with the section rhythm (py-(--section-py)). */
	padded?: boolean;
	/** grand = museum breathing (--section-py-grand) for home sections. */
	rhythm?: "default" | "grand";
	/** Render an organic <PigmentWash /> as the first child (hero and closing-CTA key moments). */
	wash?: boolean;
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
	rhythm = "default",
	wash = false,
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
				wash && "relative overflow-hidden [contain:paint]",
				borderTop && "border-t border-line",
				borderBottom && "border-b border-line",
				className,
			)}
		>
			{wash ? <PigmentWash /> : null}
			{padded ? (
				<Container
					size={size}
					className={cn(
						rhythm === "grand" ? "py-(--section-py-grand)" : "py-(--section-py)",
						containerClassName,
					)}
				>
					{children}
				</Container>
			) : (
				children
			)}
		</section>
	);
}

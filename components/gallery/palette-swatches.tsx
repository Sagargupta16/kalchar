"use client";

import type { CSSProperties } from "react";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { cn } from "@/lib/utils";
import "@/components/editorial/editorial.css";

interface PaletteSwatchesProps {
	palette?: readonly string[] | null;
	/** Accessible name for the whole row (it is one image to assistive tech). */
	label: string;
	className?: string;
}

/**
 * The detail page's palette: overlapping pigment discs sampled from the
 * painting that pop in one after another when the row scrolls in, and fan
 * apart on hover (translate only). Hex values are the artwork's data, not theme colours.
 */
export function PaletteSwatches({ palette, label, className }: Readonly<PaletteSwatchesProps>) {
	const [ref, state] = useViewReveal<HTMLDivElement>();
	if (!palette || palette.length === 0) return null;
	return (
		<div
			ref={ref}
			data-reveal={state}
			role="img"
			aria-label={label}
			className={cn("group/palette flex items-center", className)}
		>
			{palette.map((hex, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: palette order is the data; duplicates are allowed
					key={`${hex}-${i}`}
					style={{ "--i": i } as CSSProperties}
					className="-ml-3 transition-transform duration-(--duration-base) ease-(--ease-out) first:ml-0 group-hover/palette:translate-x-[calc(var(--i)*1rem)]"
				>
					<span
						className="swatch block size-12 rounded-full shadow-e2 ring-2 ring-bg sm:size-14"
						style={{ backgroundColor: hex }}
					/>
				</span>
			))}
		</div>
	);
}

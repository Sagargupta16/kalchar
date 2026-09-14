import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PlateFrame -- the standard museum plate (visual-direction 1.9). Rests on the
 * edged warm ladder so plates read as floating even when still (steering
 * 2026-09-14): grid plates at shadow-e1-edged, goldRest plates (hero front,
 * detail, featured) at shadow-e3-edged, matching the elevation role map. Hover
 * crossfades elevate-e3 with a 4px group lift, plus a concentric gold inset
 * line 6px in (rest at opacity 0, full on group hover, or always on via
 * `goldRest`). `sheen` runs the approved gold-leaf loop (deferred 23; hero
 * front plate only, --sheen-every 8s). `glow` feeds --plate-glow for the
 * lightbox's palette glow (the sanctioned raw-colour exception) and swaps the
 * resting shadow for shadow-glow. Never scales the image: the frame moves,
 * the picture does not. Idle motion is NOT here: consumers wrap the frame in
 * a .plate-float node (animations.css) so the loop never fights this
 * element's hover transform.
 *
 * The sheen lives on a child layer, not the root: the elevate-* utility and
 * .gold-sheen both paint on ::after, and elevate's z-index -1 would bury the
 * band behind the plate image.
 */

interface PlateFrameProps {
	/** md for grid, hero and event plates; lg for the lightbox figure and detail plate only (D13). */
	radius?: "md" | "lg";
	/** Rest the inset gold line at full opacity (hero front plate, detail plate, featured). */
	goldRest?: boolean;
	/** Gold-leaf sheen loop on the frame (hero front plate only; one loop per view). */
	sheen?: boolean;
	/** CSS colour for the palette glow behind the plate (most saturated palette swatch). */
	glow?: string;
	className?: string;
	children: ReactNode;
}

export function PlateFrame({
	radius = "md",
	goldRest = false,
	sheen = false,
	glow,
	className,
	children,
}: Readonly<PlateFrameProps>) {
	const style =
		sheen || glow
			? ({
					...(sheen ? { "--sheen-every": "8s" } : null),
					...(glow ? { "--plate-glow": glow } : null),
				} as CSSProperties)
			: undefined;
	const edgedRest = goldRest ? "shadow-e3-edged" : "shadow-e1-edged";
	return (
		<div
			style={style}
			className={cn(
				"relative overflow-hidden bg-canvas transition-ui elevate-e3 group-hover:-translate-y-1",
				glow ? "shadow-glow" : edgedRest,
				radius === "lg" ? "rounded-(--radius-lg)" : "rounded-(--radius-md)",
				className,
			)}
		>
			{children}
			{sheen ? (
				<span
					aria-hidden="true"
					data-sheen="loop"
					className="gold-sheen pointer-events-none absolute inset-0 rounded-[inherit]"
				/>
			) : null}
			<span
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-1.5 border border-(--color-gold-hairline) transition-opacity",
					radius === "lg"
						? "rounded-[calc(var(--radius-lg)-6px)]"
						: "rounded-[calc(var(--radius-md)-6px)]",
					goldRest ? "opacity-100" : "opacity-0 group-hover:opacity-100",
				)}
			/>
		</div>
	);
}

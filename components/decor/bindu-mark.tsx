import { cn } from "@/lib/utils";

/**
 * Bindu mark -- the minimal Gond citation: a three-dot band (4px centre circle
 * flanked by two 2px dots 6px away) as one 16x8 inline SVG in currentColor.
 * Pure ornament (aria-hidden). Placement is bound by the motif matrix
 * (visual-direction 1.6): before the wall-label eyebrow line on /work/[slug]
 * and in the lightbox sidebar, and on /events figure captions. Never on home
 * teaser eyebrows and never under /admin.
 */
export function BinduMark({ className }: Readonly<{ className?: string }>) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			width="16"
			height="8"
			viewBox="0 0 16 8"
			fill="currentColor"
			className={cn("shrink-0", className)}
		>
			<circle cx="2" cy="4" r="1" />
			<circle cx="8" cy="4" r="2" />
			<circle cx="14" cy="4" r="1" />
		</svg>
	);
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cards above this index render through Motion whileInView; the first six paint
 *  with the CSS reveal so the grid is never blank before hydration. */
export const EAGER_CARD_COUNT = 6;

/** Image sizes hint shared by every consumer of this grid (3 columns from lg). */
export const GALLERY_CARD_SIZES =
	"(min-width: 1152px) 350px, (min-width: 1024px) 30vw, calc((100vw - 56px) / 2)";

/** Sizes hint for the spanning lead tiles (col-span-2 at 390 and in the lg spread). */
export const GALLERY_LEAD_SIZES = "(min-width: 1024px) 44rem, 100vw";

interface GalleryGridProps {
	/** 3 for /work and the home strips, 4 for the custom-orders style strip. */
	cols?: 3 | 4;
	/** Editorial spread rhythm: the first tile spans both columns at 390 and
	 *  every 7th tile spans 2 of 3 columns from lg (visual-direction 2.2). */
	spanLead?: boolean;
	className?: string;
	children: ReactNode;
}

/** The one artwork plate grid: 2 columns on phones, 3 (or 4) from lg. Plate-grid
 *  rhythm (visual-direction 1.5): wider row gap than column gap on purpose --
 *  captions need air below, plates sit shoulder to shoulder. overflow-x: clip so
 *  a mid-tilt plate corner never widens the page (TiltPlate host rule). */
export function GalleryGrid({
	cols = 3,
	spanLead = false,
	className,
	children,
}: Readonly<GalleryGridProps>) {
	return (
		<ul
			className={cn(
				"grid grid-cols-2 gap-x-4 gap-y-10 [overflow-x:clip] sm:gap-x-6 lg:gap-x-10 lg:gap-y-16",
				cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
				spanLead && "[&>li:first-child]:col-span-2 lg:[&>li:nth-child(7n+1)]:col-span-2",
				className,
			)}
		>
			{children}
		</ul>
	);
}

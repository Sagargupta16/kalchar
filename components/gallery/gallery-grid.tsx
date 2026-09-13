import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Cards above this index render through Motion whileInView; the first six paint
 *  with the CSS reveal so the grid is never blank before hydration. */
export const EAGER_CARD_COUNT = 6;

/** Image sizes hint shared by every consumer of this grid (3 columns from lg). */
export const GALLERY_CARD_SIZES =
	"(min-width: 1152px) 350px, (min-width: 1024px) 30vw, calc((100vw - 56px) / 2)";

interface GalleryGridProps {
	/** 3 for /work and the home strips, 4 for the custom-orders style strip. */
	cols?: 3 | 4;
	className?: string;
	children: ReactNode;
}

/** The one artwork plate grid: 2 columns on phones, 3 (or 4) from lg. Column gap
 *  16px then 24px from sm, row gap 32px (system rhythm 3.1: this string is the
 *  sanctioned exception to gap-(--grid-gap) because plates are taller than wide). */
export function GalleryGrid({ cols = 3, className, children }: Readonly<GalleryGridProps>) {
	return (
		<ul
			className={cn(
				"grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6",
				cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
				className,
			)}
		>
			{children}
		</ul>
	);
}

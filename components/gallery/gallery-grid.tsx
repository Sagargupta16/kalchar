import type { ReactNode } from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
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

/** A consistent card grid with room for the hover lift and soft shadow. */
export function GalleryGrid({
	cols = 3,
	spanLead = false,
	className,
	children,
}: Readonly<GalleryGridProps>) {
	return (
		<ul
			className={cn(
				"grid grid-cols-2 items-stretch gap-4 sm:gap-6",
				cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
				spanLead && "[&>li:first-child]:col-span-2 lg:[&>li:nth-child(7n+1)]:col-span-2",
				className,
			)}
		>
			{children}
		</ul>
	);
}

/** The route and search-parameter fallback reserve the same controls and flat grid. */
export function GallerySkeleton() {
	return (
		<div aria-busy="true">
			<output className="sr-only">Loading artwork</output>
			<div className="mb-5 flex flex-wrap items-end gap-3 sm:gap-6">
				<div className="grid w-full gap-2 sm:max-w-xl sm:flex-1">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-control w-full" />
				</div>
				<Skeleton className="h-control w-44 rounded-full" />
			</div>
			<div className="flex gap-2 overflow-hidden py-3 lg:py-0">
				{[0, 1, 2, 3, 4, 5, 6].map((slot) => (
					<Skeleton key={slot} className="h-control w-24 shrink-0 rounded-full" />
				))}
			</div>
			<Skeleton className="mt-5 h-5 w-40" />
			<GalleryGrid className="mt-5">
				{[0, 1, 2, 3, 4, 5].map((slot) => (
					<li key={slot}>
						<SkeletonCard />
					</li>
				))}
			</GalleryGrid>
		</div>
	);
}

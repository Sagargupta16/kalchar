import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder. A muted block with a shimmer sweep (CSS keyframe in
 * globals.css, `.skeleton`). Used in route `loading.tsx` files as the Suspense
 * fallback while server data resolves. Reduced-motion drops the shimmer to a
 * static tint (handled in globals.css).
 */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
	return <div aria-hidden="true" className={cn("skeleton rounded-(--radius-sm)", className)} />;
}

/** A 3:4 image-plate skeleton matching the gallery card aspect. */
export function SkeletonCard({ className }: Readonly<{ className?: string }>) {
	return (
		<div className={cn("space-y-3", className)}>
			<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
			<div className="flex items-center justify-between gap-3">
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="h-3 w-12" />
			</div>
			<Skeleton className="h-3 w-1/2" />
		</div>
	);
}

/** A section header skeleton (eyebrow + title + lead). */
export function SkeletonHeader() {
	return (
		<div className="max-w-2xl space-y-4">
			<Skeleton className="h-3 w-24" />
			<Skeleton className="h-10 w-3/4" />
			<Skeleton className="h-4 w-full max-w-md" />
		</div>
	);
}

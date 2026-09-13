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

/**
 * Page/section header skeleton sized from the header token; the one recipe
 * every loading.tsx uses. `compact` is the admin page-header shape (h1 + one
 * help line, no eyebrow); default is the public eyebrow + title + lead shape.
 */
export function SkeletonHeader({ compact = false }: Readonly<{ compact?: boolean }>) {
	return (
		<div className="max-w-(--header-max)">
			{compact ? null : <Skeleton className="h-3 w-24" />}
			<Skeleton className={cn(compact ? "h-6 w-28 sm:h-7" : "mt-4 h-10 w-3/4")} />
			<Skeleton className={cn("mt-2 h-5 w-72 max-w-full", !compact && "mt-4 h-4 max-w-md")} />
		</div>
	);
}

/** `count` admin-row placeholders (h-16 = the 72px reorder row minus its border) in a polite live region. */
export function SkeletonRows({
	count,
	className,
}: Readonly<{ count: number; className?: string }>) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-live="polite"
			className={cn("space-y-tight", className)}
		>
			<span className="sr-only">Loading</span>
			{Array.from({ length: count }, (_, i) => i).map((slot) => (
				<Skeleton key={slot} className="h-16 rounded-(--radius-sm)" />
			))}
		</div>
	);
}

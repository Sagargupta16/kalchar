import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder. A muted block with a shimmer sweep (CSS keyframe in
 * globals.css, `.skeleton`). Used in route `loading.tsx` files as the Suspense
 * fallback while server data resolves.
 */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
	return <div aria-hidden="true" className={cn("skeleton rounded-(--radius-sm)", className)} />;
}

/** Reserves the artwork card's image and compact caption. */
export function SkeletonCard({ className }: Readonly<{ className?: string }>) {
	return (
		<div className={cn("space-y-3 rounded-md border border-line p-1.5", className)}>
			<Skeleton className="aspect-4/5 w-full rounded-md" />
			<div className="flex items-center justify-between gap-3 px-3 pt-2">
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="h-3 w-12" />
			</div>
			<div className="px-3 pb-3">
				<Skeleton className="h-3 w-1/2" />
			</div>
		</div>
	);
}

/**
 * Page/section header skeleton sized from the header token; the one recipe
 * every loading.tsx uses. `compact` is the admin page-header shape (h1 + one
 * help line, no eyebrow); default follows the public heading's 12px/16px
 * gaps and uses its type styles to reserve one line of title and lead.
 */
export function SkeletonHeader({ compact = false }: Readonly<{ compact?: boolean }>) {
	return (
		<div className="max-w-(--header-max)">
			{compact ? null : <Skeleton className="h-3 w-24" />}
			<Skeleton className={compact ? "h-6 w-28 sm:h-7" : "t-headline mt-3 h-lh w-3/4 text-h1"} />
			<Skeleton
				className={compact ? "mt-2 h-5 w-72 max-w-full" : "t-lead mt-4 h-lh w-full max-w-md"}
			/>
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

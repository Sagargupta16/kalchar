import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { adminRow } from "./controls";

/**
 * Loading shapes shared by the admin loading.tsx files. Each one is drawn on
 * the real frame it stands in for (adminRow cards, the segmented track, the
 * stat tiles), so nothing shifts when the data resolves; the shimmer is the
 * shared .skeleton sweep (one step darker on admin panels, admin-theme.css).
 */

/** A list section header: title + description on the left, the secondary Add on the right. */
export function AdminListHeaderSkeleton({ action = true }: Readonly<{ action?: boolean }>) {
	return (
		<div className="mb-(--form-gap) flex items-start justify-between gap-3">
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-5 w-36" />
				<Skeleton className="h-4 w-full max-w-72" />
			</div>
			{action ? <Skeleton className="h-control w-32 shrink-0" /> : null}
		</div>
	);
}

/** `count` row cards: thumbnail or disc, two text bars, trailing controls. */
export function AdminRowsSkeleton({
	count,
	thumb = "size-14",
	controls = 2,
	className,
}: Readonly<{ count: number; thumb?: string; controls?: number; className?: string }>) {
	return (
		<div className={cn("space-y-tight", className)}>
			{Array.from({ length: count }, (_, i) => i).map((slot) => (
				<div key={slot} className={cn(adminRow, "flex items-center gap-3")}>
					<Skeleton className={cn("shrink-0", thumb)} />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-1/2 max-w-56" />
						<Skeleton className="h-3 w-3/4 max-w-80" />
					</div>
					{Array.from({ length: controls }, (_, c) => c).map((control) => (
						<Skeleton key={control} className="size-control shrink-0" />
					))}
				</div>
			))}
		</div>
	);
}

/** The FilterTabs track with `count` segments. */
export function AdminTabsSkeleton({ count }: Readonly<{ count: number }>) {
	return (
		<div className="inline-flex gap-1 rounded-(--radius-md) bg-canvas p-1 ring-1 ring-line">
			{Array.from({ length: count }, (_, i) => i).map((slot) => (
				<Skeleton key={slot} className="h-control w-20" />
			))}
		</div>
	);
}

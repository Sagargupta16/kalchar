import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AdminPageWidth = "narrow" | "default" | "wide";

/**
 * Routes fill the available content column, including beside the desktop
 * navigation. Keep the width prop compatible with existing route frames.
 */
const WIDTH: Record<AdminPageWidth, string | undefined> = {
	narrow: undefined,
	default: undefined,
	wide: undefined,
};

interface AdminPageHeaderProps {
	title: string;
	description?: ReactNode;
	/** Extra intro content under the description (lists, notes). */
	children?: ReactNode;
	/** Page-level actions wrap below the title whenever the content column is narrow. */
	actions?: ReactNode;
}

/**
 * Alignment rule 1 (one left edge per page): the header sits inside the same
 * --card-pad inset the panels below it use, so the h1 lines up with every
 * panel title, row title and form label (the panel's 1px border is the only
 * remaining delta). The actions slot ends at the panels' content edge (rule 2).
 */
const HEADER_INSET = "px-(--card-pad)";

export function AdminPageHeader({
	title,
	description,
	children,
	actions,
}: Readonly<AdminPageHeaderProps>) {
	return (
		<header
			className={cn(
				"flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-4",
				HEADER_INSET,
			)}
		>
			<div className="min-w-0 max-w-(--header-max) flex-[1_1_20rem]">
				<h1 className="t-heading text-h1 wrap-break-word text-ink">{title}</h1>
				{description ? (
					<p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{description}</p>
				) : null}
				{children ? <div className="mt-3">{children}</div> : null}
			</div>
			{actions ? (
				<div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</header>
	);
}

interface AdminPageProps extends Omit<AdminPageHeaderProps, "children"> {
	width?: AdminPageWidth;
	/** Intro content under the description (the AdminPageHeader children slot). */
	intro?: ReactNode;
	className?: string;
	children: ReactNode;
}

/** The one page frame every /admin route renders into (D16): heading, intro, actions, 32px rhythm. */
export function AdminPage({
	title,
	description,
	intro,
	actions,
	width = "default",
	className,
	children,
}: Readonly<AdminPageProps>) {
	return (
		<div className={cn("min-w-0 space-y-page", WIDTH[width], className)}>
			<AdminPageHeader title={title} description={description} actions={actions}>
				{intro}
			</AdminPageHeader>
			{children}
		</div>
	);
}

/**
 * The header shape at rest, on the header's inset so nothing shifts on
 * resolve. Sized locally to the text-h1 rung (1.1): chrome's compact
 * SkeletonHeader stayed on the old 20px bar and components/ui/skeleton.tsx is
 * public-lane property, so the admin grows its own bars here.
 */
export function AdminPageHeaderSkeleton() {
	return (
		<div className={cn(HEADER_INSET, "max-w-(--header-max) space-y-3")}>
			{/* h-11 tracks the calmed text-h1 line box (44px x 1.05 at 1280; steering 2026-09-14). */}
			<Skeleton className="h-9 w-40 sm:h-11" />
			<Skeleton className="h-4 w-64 max-w-full" />
		</div>
	);
}

/**
 * Wrapper for every loading.tsx: same width and rhythm as the page it stands
 * in for, header skeleton first, then the route's own row skeletons. The
 * 150ms show-delay keeps a warm-cache navigation from flashing a skeleton
 * before a loading placeholder becomes useful.
 */
export function AdminPageSkeleton({
	width = "default",
	children,
}: Readonly<{ width?: AdminPageWidth; children?: ReactNode }>) {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-live="polite"
			className={cn(
				"min-w-0 space-y-page starting:opacity-0 transition-opacity delay-(--duration-fast) duration-(--duration-fast)",
				WIDTH[width],
			)}
		>
			<span className="sr-only">Loading</span>
			<AdminPageHeaderSkeleton />
			{children}
		</div>
	);
}

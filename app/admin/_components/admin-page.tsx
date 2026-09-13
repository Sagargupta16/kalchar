import type { ReactNode } from "react";
import { SkeletonHeader } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AdminPageWidth = "narrow" | "default" | "wide";

/**
 * narrow  = 42rem (672px): categories, presets, profile, maintainers (today max-w-2xl).
 * default = 48rem (768px): events, workshops, testimonials, leads (today max-w-3xl).
 * wide    = the full content measure (72rem via <main>). Kept in the type for a
 *           future wide route; no route uses it in 1.39.0. The dashboard stays on
 *           `default` (D16 + admin-catalog-17: every admin route on one 768px
 *           column; admin-catalog change 6 says the same).
 */
const WIDTH: Record<AdminPageWidth, string | undefined> = {
	narrow: "max-w-(--header-max)",
	default: "max-w-(--prose-max)",
	wide: undefined,
};

interface AdminPageHeaderProps {
	title: string;
	description?: ReactNode;
	/** Extra intro content under the description (lists, notes). */
	children?: ReactNode;
	/** Page-level actions (at most one primary), right of the title on sm+, under it on phones. */
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
				"flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
				HEADER_INSET,
			)}
		>
			<div className="min-w-0 max-w-(--header-max)">
				<h1 className="t-heading text-xl text-ink sm:text-2xl">{title}</h1>
				{description ? (
					<p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{description}</p>
				) : null}
				{children ? <div className="mt-3">{children}</div> : null}
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
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
		<div className={cn("space-y-page", WIDTH[width], className)}>
			<AdminPageHeader title={title} description={description} actions={actions}>
				{intro}
			</AdminPageHeader>
			{children}
		</div>
	);
}

/** The header shape at rest; sized by chrome's compact SkeletonHeader (D17), on the header's inset so nothing shifts on resolve. */
export function AdminPageHeaderSkeleton() {
	return (
		<div className={HEADER_INSET}>
			<SkeletonHeader compact />
		</div>
	);
}

/**
 * Wrapper for every loading.tsx: same width and rhythm as the page it stands
 * in for, header skeleton first, then the route's own row skeletons. The
 * 150ms show-delay keeps a warm-cache navigation from flashing a skeleton
 * (research: skeleton show-delay); reduced motion shows it immediately.
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
				"space-y-page starting:opacity-0 motion-safe:transition-opacity motion-safe:delay-(--duration-fast) motion-safe:duration-(--duration-fast)",
				WIDTH[width],
			)}
		>
			<span className="sr-only">Loading</span>
			<AdminPageHeaderSkeleton />
			{children}
		</div>
	);
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "default" | "compact" | "nested";
type EmptyStateVoice = "gallery" | "tool";

interface EmptyStateProps {
	/** Single-line lucide icon in the section pigment; no illustration scenes. */
	icon?: ReactNode;
	title?: string;
	body?: ReactNode;
	/** Exactly one real Button or Link. Three CTAs is a smell. */
	action?: ReactNode;
	variant?: EmptyStateVariant;
	/** gallery = t-display title (public); tool = sans semibold (admin). */
	voice?: EmptyStateVoice;
	as?: "div" | "li";
	className?: string;
	/** Rendered as the body when `body` is absent (migration convenience). */
	children?: ReactNode;
}

const ROOT: Record<EmptyStateVariant, string> = {
	default:
		"rounded-(--radius-md) border border-dashed border-line bg-canvas px-(--card-pad) py-12 text-center",
	compact:
		"rounded-(--radius-sm) border border-dashed border-line p-6 text-center text-sm text-muted",
	nested:
		"rounded-(--radius-sm) border border-dashed border-line p-4 text-center text-xs text-muted",
};

const TITLE: Record<EmptyStateVoice, string> = {
	gallery: "t-display mt-4 text-h3 text-ink",
	tool: "mt-4 text-base font-semibold tracking-tight text-ink",
};

/**
 * Status line + how to populate + one real button. `role="status"` so a late
 * empty state is announced without being an alert; never render it while data
 * is loading (skeleton instead).
 */
export function EmptyState({
	icon,
	title,
	body,
	action,
	variant = "default",
	voice = "gallery",
	as: Tag = "div",
	className,
	children,
}: Readonly<EmptyStateProps>) {
	const copy = body ?? children;
	return (
		<Tag role="status" className={cn(ROOT[variant], className)}>
			{icon ? (
				<span
					aria-hidden="true"
					className="mx-auto grid size-control place-items-center rounded-full bg-surface text-(--section-accent)"
				>
					{icon}
				</span>
			) : null}
			{title ? <p className={cn(TITLE[voice], !icon && "mt-0")}>{title}</p> : null}
			{copy ? (
				<p
					className={cn(
						"mx-auto max-w-md text-muted",
						variant === "default" ? "mt-2 text-sm" : "mt-1",
					)}
				>
					{copy}
				</p>
			) : null}
			{action ? <div className="mt-6 flex justify-center">{action}</div> : null}
		</Tag>
	);
}

"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminBtnPrimary, ICON_MD } from "./controls";
import { usePendingVisible } from "./use-admin-action";

/**
 * The one fixed slot above the mobile tab bar (viewport bottom from xl).
 * ReorderBar and UndoBar (D26) both render into it; a manager shows one or
 * the other, never both. Returns a fragment: an in-flow spacer the height
 * of the bar so the last list row is never hidden, then the fixed bar.
 */
export function BottomBar({
	children,
	className,
	role,
	"aria-live": ariaLive,
}: Readonly<{
	children: ReactNode;
	className?: string;
	role?: "status";
	"aria-live"?: "polite";
}>) {
	return (
		<>
			<div aria-hidden="true" className="h-18" />
			<div
				role={role}
				aria-live={ariaLive}
				className={cn(
					"fixed inset-x-0 bottom-(--tabbar-offset) z-sticky border-t border-line bg-surface xl:bottom-0 starting:translate-y-2 starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
					className,
				)}
			>
				<Container className="flex items-center justify-between gap-3 py-3 xl:pb-[max(0.75rem,var(--spacing-safe-bottom))]">
					{children}
				</Container>
			</div>
		</>
	);
}

function SaveButton({
	pending,
	label,
	onClick,
}: Readonly<{ pending: boolean; label: string; onClick: () => void }>) {
	const spinning = usePendingVisible(pending);
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={pending}
			aria-busy={pending || undefined}
			className={cn(adminBtnPrimary, "min-w-28")}
		>
			{spinning ? (
				<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
			) : null}
			{label}
		</button>
	);
}

interface ReorderBarProps {
	/** Left-hand text; consumers pass their entity ("Gallery order changed"). */
	label?: string;
	pending: boolean;
	saved: boolean;
	/** The reorder save's failure, rendered inside the bar in place of the label. */
	error?: string | null;
	saveLabel?: string;
	onSave: () => void;
	onReset: () => void;
}

/**
 * Sticky Save / Reset bar shown while a reorderable list has unsaved order
 * changes. Sits flush on the mobile tab bar and at the viewport bottom from
 * xl. While `saved`, only "Order saved" renders (the consumer unmounts the
 * bar after SAVED_BADGE_DURATION_MS).
 */
export function ReorderBar({
	label = "Order changed",
	pending,
	saved,
	error,
	saveLabel = "Save order",
	onSave,
	onReset,
}: Readonly<ReorderBarProps>) {
	// Staged order is unsaved work: warn before the tab closes or reloads.
	useEffect(() => {
		if (saved) return;
		const guard = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", guard);
		return () => window.removeEventListener("beforeunload", guard);
	}, [saved]);

	return (
		<BottomBar>
			{error ? (
				<AdminNotice variant="error" className="min-w-0 flex-1">
					{error}
				</AdminNotice>
			) : (
				<p className="min-w-0 flex-1 truncate text-sm text-muted">
					{saved ? <output className="text-accent-text">Order saved</output> : label}
				</p>
			)}
			{saved && !error ? null : (
				<div className="flex shrink-0 items-center gap-3">
					<button type="button" onClick={onReset} disabled={pending} className={adminBtn}>
						Reset
					</button>
					<SaveButton pending={pending} label={saveLabel} onClick={onSave} />
				</div>
			)}
		</BottomBar>
	);
}

interface InlineReorderControlsProps {
	pending: boolean;
	saved: boolean;
	onSave: () => void;
	onReset: () => void;
	/** Optional text before the buttons; a panel action slot usually omits it. */
	label?: string;
	saveLabel?: string;
	error?: string | null;
	/** row = Reset and Save side by side (default); column = stacked full width for slots under 12rem (D25 naming). */
	layout?: "row" | "column";
	className?: string;
}

/**
 * The in-panel Save order / Reset pair for lists that cannot use the fixed
 * bar (a panel per preset group, the event photo toolbar). Same strings,
 * same buttons, same pending and saved behaviour as ReorderBar (system 9.8).
 */
export function InlineReorderControls({
	pending,
	saved,
	onSave,
	onReset,
	label,
	saveLabel = "Save order",
	error,
	layout = "row",
	className,
}: Readonly<InlineReorderControlsProps>) {
	return (
		<div
			className={cn(
				"flex gap-2",
				layout === "column" ? "flex-col items-stretch" : "flex-wrap items-center",
				className,
			)}
		>
			{error ? (
				<AdminNotice variant="error" className="min-w-0 basis-full">
					{error}
				</AdminNotice>
			) : null}
			{!error && label && !saved ? (
				<p className="min-w-0 truncate text-sm text-muted">{label}</p>
			) : null}
			{!error && saved ? <output className="text-sm text-accent-text">Order saved</output> : null}
			<button type="button" onClick={onReset} disabled={pending} className={adminBtn}>
				Reset
			</button>
			<SaveButton pending={pending} label={saveLabel} onClick={onSave} />
		</div>
	);
}

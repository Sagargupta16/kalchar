"use client";

import { adminBtn } from "./controls";

/**
 * Sticky bottom save/reset bar, shown while a reorderable list has unsaved
 * order changes. Pinned to the viewport bottom so it's reachable without
 * scrolling back up; sits above the mobile admin tab bar (bottom-14 on
 * small screens, bottom-0 on md+). Shared by every admin reorder list.
 */
export function ReorderBar({
	label,
	pending,
	saved,
	onSave,
	onReset,
}: Readonly<{
	label: string;
	pending: boolean;
	saved: boolean;
	onSave: () => void;
	onReset: () => void;
}>) {
	return (
		<div className="fixed inset-x-0 bottom-14 z-20 border-y border-line bg-bg/95 backdrop-blur-md md:bottom-0 md:border-b-0">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-(--container-px) py-3 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<p className="text-sm text-muted">{label}</p>
				<div className="flex items-center gap-2.5">
					{saved ? <span className="text-sm text-accent">Saved</span> : null}
					<button
						type="button"
						onClick={onReset}
						disabled={pending}
						className={`${adminBtn} px-3 py-1.5`}
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSave}
						disabled={pending}
						className="inline-flex h-9 items-center rounded-(--radius-sm) bg-accent px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{pending ? "Saving..." : "Save order"}
					</button>
				</div>
			</div>
		</div>
	);
}

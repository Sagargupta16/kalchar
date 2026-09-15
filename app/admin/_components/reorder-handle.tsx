"use client";

import { GripVertical } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { adminIconBtnGhost, ICON_MD } from "./controls";
import { type ReorderAxis, type ReorderLayout, ReorderMoveControls } from "./reorder-move-menu";

const DESCRIPTION =
	"Use the up and down arrow keys to move. Home moves to the first position; End moves to the last.";

interface ReorderHandleProps {
	label: string;
	index: number;
	count: number;
	disabled: boolean;
	onMove: (to: number) => void;
	/** horizontal = photo grids: Move left / right labels and icons; the keyboard also accepts Left / Right. */
	axis?: ReorderAxis;
	/** Passed through to the Move pair (D25). Defaults from axis: vertical -> column, horizontal -> row. */
	layout?: ReorderLayout;
	className?: string;
}

/**
 * Three paths into one move(from, to): drag (the row's dragProps, fine
 * pointers), keyboard on the grip, and two visible Move buttons on coarse
 * pointers (D11). The grip is display:none on coarse pointers and the buttons
 * are display:none on fine pointers, so the DOM is identical on both and no
 * hydration mismatch is possible.
 */
export function ReorderHandle({
	label,
	index,
	count,
	disabled,
	onMove,
	axis = "vertical",
	layout,
	className,
}: Readonly<ReorderHandleProps>) {
	const descriptionId = useId();
	const [announce, setAnnounce] = useState("");
	const inert = disabled || count < 2;

	const move = (to: number) => {
		if (to < 0 || to >= count || to === index) return;
		onMove(to);
		setAnnounce(`${label}, position ${to + 1} of ${count}`);
	};

	const keys: Record<string, number> = {
		ArrowUp: index - 1,
		ArrowDown: index + 1,
		Home: 0,
		End: count - 1,
		...(axis === "horizontal" ? { ArrowLeft: index - 1, ArrowRight: index + 1 } : {}),
	};

	return (
		<span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
			<button
				type="button"
				disabled={inert}
				aria-label={`Reorder ${label}, position ${index + 1} of ${count}`}
				aria-describedby={descriptionId}
				aria-keyshortcuts={
					axis === "horizontal"
						? "ArrowUp ArrowDown ArrowLeft ArrowRight Home End"
						: "ArrowUp ArrowDown Home End"
				}
				onKeyDown={(event) => {
					const target = keys[event.key];
					if (target === undefined) return;
					event.preventDefault();
					move(target);
				}}
				className={cn(
					adminIconBtnGhost,
					"cursor-grab active:cursor-grabbing disabled:cursor-default pointer-coarse:hidden",
				)}
			>
				<GripVertical size={ICON_MD} aria-hidden="true" />
				<span id={descriptionId} className="sr-only">
					{DESCRIPTION}
				</span>
			</button>
			<ReorderMoveControls
				label={label}
				index={index}
				count={count}
				disabled={inert}
				onMove={move}
				axis={axis}
				layout={layout}
				className="hidden pointer-coarse:flex"
			/>
			<span aria-live="polite" aria-atomic="true" className="sr-only">
				{announce}
			</span>
		</span>
	);
}

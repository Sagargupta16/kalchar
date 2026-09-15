"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminIconBtn, ICON_MD } from "./controls";

export type ReorderAxis = "vertical" | "horizontal";
export type ReorderLayout = "column" | "row";

interface ReorderMoveControlsProps {
	label: string;
	index: number;
	count: number;
	disabled?: boolean;
	onMove: (to: number) => void;
	axis?: ReorderAxis;
	/** column = one 44px-wide stack (vertical lists, D25); row = side by side (photo tiles). Defaults from axis. */
	layout?: ReorderLayout;
	className?: string;
}

/**
 * The single-pointer reorder path (WCAG 2.5.7, technique G219): two 44px
 * buttons that move one step. In a row they are 44 + 8 + 44 = 96px wide,
 * which fits a 137px photo tile at 360px (D11); in a column they are 44px
 * wide and 96px tall, so a list row keeps its title width (D25). Remove
 * never sits with them; it goes in the tile's footer or the row's far end.
 */
export function ReorderMoveControls({
	label,
	index,
	count,
	disabled = false,
	onMove,
	axis = "vertical",
	layout = axis === "vertical" ? "column" : "row",
	className,
}: Readonly<ReorderMoveControlsProps>) {
	const [PrevIcon, NextIcon] =
		axis === "vertical" ? [ChevronUp, ChevronDown] : [ChevronLeft, ChevronRight];
	const [prevWord, nextWord] = axis === "vertical" ? ["up", "down"] : ["left", "right"];
	return (
		<span
			className={cn("flex gap-2", layout === "column" ? "flex-col" : "items-center", className)}
		>
			<button
				type="button"
				disabled={disabled || index <= 0}
				aria-label={`Move ${label} ${prevWord}`}
				onClick={() => onMove(index - 1)}
				className={adminIconBtn}
			>
				<PrevIcon size={ICON_MD} aria-hidden="true" />
			</button>
			<button
				type="button"
				disabled={disabled || index >= count - 1}
				aria-label={`Move ${label} ${nextWord}`}
				onClick={() => onMove(index + 1)}
				className={adminIconBtn}
			>
				<NextIcon size={ICON_MD} aria-hidden="true" />
			</button>
		</span>
	);
}

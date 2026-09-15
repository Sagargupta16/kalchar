"use client";

import type { MotionValue, PanInfo } from "motion/react";
import { type RefObject, useCallback, useRef } from "react";
import { DRAG_CLOSE_FRACTION, DRAG_VELOCITY_PX_S } from "@/lib/motion";

const SCRIM_DRAG_FADE = 0.6;

interface ViewerDragOptions {
	figureRef: RefObject<HTMLElement | null>;
	scrimOpacity: MotionValue<number>;
	onNext?: () => void;
	onPrevious?: () => void;
	onDismiss: () => void;
}

/** Horizontal paging and downward dismissal share the same distance and velocity thresholds. */
export function useViewerDrag({
	figureRef,
	scrimOpacity,
	onNext,
	onPrevious,
	onDismiss,
}: Readonly<ViewerDragOptions>) {
	const dragAxis = useRef<"x" | "y" | null>(null);

	const onDirectionLock = useCallback((axis: "x" | "y") => {
		dragAxis.current = axis;
	}, []);

	const onDrag = useCallback(
		(_event: unknown, info: PanInfo) => {
			if (dragAxis.current !== "y") return;
			const height = figureRef.current?.getBoundingClientRect().height ?? 1;
			const progress = Math.min(Math.max(info.offset.y / height, 0), 1);
			scrimOpacity.set(1 - SCRIM_DRAG_FADE * progress);
		},
		[figureRef, scrimOpacity],
	);

	const onDragEnd = useCallback(
		(_event: unknown, info: PanInfo) => {
			const axis = dragAxis.current;
			dragAxis.current = null;
			scrimOpacity.set(1);
			const rect = figureRef.current?.getBoundingClientRect();
			const width = rect?.width ?? 1;
			const height = rect?.height ?? 1;
			const { offset, velocity } = info;
			if (axis === "x") {
				if (offset.x < -DRAG_CLOSE_FRACTION * width || velocity.x < -DRAG_VELOCITY_PX_S) {
					onNext?.();
				} else if (offset.x > DRAG_CLOSE_FRACTION * width || velocity.x > DRAG_VELOCITY_PX_S) {
					onPrevious?.();
				}
				return;
			}
			if (
				axis === "y" &&
				(offset.y > DRAG_CLOSE_FRACTION * height || velocity.y > DRAG_VELOCITY_PX_S)
			) {
				onDismiss();
			}
		},
		[figureRef, scrimOpacity, onNext, onPrevious, onDismiss],
	);

	return { onDrag, onDragEnd, onDirectionLock };
}

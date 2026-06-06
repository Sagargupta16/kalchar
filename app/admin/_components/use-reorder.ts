"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Drag-and-drop reorder state machine shared by the artwork and workshop
 * admin lists. Tracks the dragged + hovered indices and reorders the items
 * array on drop. The caller owns the items array (so it can diff against the
 * server order and show a "Save" affordance); this hook only handles the
 * drag interaction and hands back the new ordering via `onReorder`.
 */
export function useReorder<T>(
	items: T[],
	onReorder: (next: T[]) => void,
): {
	dragging: number | null;
	over: number | null;
	dragProps: (index: number) => {
		draggable: true;
		onDragStart: () => void;
		onDragOver: (e: React.DragEvent) => void;
		onDrop: () => void;
		onDragEnd: () => void;
	};
} {
	const [dragging, setDragging] = useState<number | null>(null);
	const [over, setOver] = useState<number | null>(null);
	const dragItem = useRef<number | null>(null);

	const reset = useCallback(() => {
		setDragging(null);
		setOver(null);
		dragItem.current = null;
	}, []);

	const drop = useCallback(
		(index: number) => {
			const from = dragItem.current;
			if (from === null || from === index) {
				reset();
				return;
			}
			const next = [...items];
			const moved = next.splice(from, 1)[0];
			if (moved === undefined) {
				reset();
				return;
			}
			next.splice(index, 0, moved);
			onReorder(next);
			reset();
		},
		[items, onReorder, reset],
	);

	const dragProps = useCallback(
		(index: number) => ({
			draggable: true as const,
			onDragStart: () => {
				dragItem.current = index;
				setDragging(index);
			},
			onDragOver: (e: React.DragEvent) => {
				e.preventDefault();
				setOver(index);
			},
			onDrop: () => drop(index),
			onDragEnd: reset,
		}),
		[drop, reset],
	);

	return { dragging, over, dragProps };
}

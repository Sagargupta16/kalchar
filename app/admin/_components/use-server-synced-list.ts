"use client";

import { useState } from "react";

/**
 * Local editable copy of a server-provided list that re-syncs when the server
 * data changes.
 *
 * Admin managers keep an optimistic local copy of their rows (so delete/pin/
 * reorder feel instant) but must also adopt fresh data after a
 * `router.refresh()` -- e.g. once a create lands. A plain `useState(initial)`
 * snapshots only on mount and ignores later prop changes, so a newly created
 * row wouldn't appear without a manual reload.
 *
 * `initial` keeps a stable reference across client-only re-renders and only
 * changes identity when the server component re-fetches, so comparing it to the
 * last-seen reference detects exactly "the server gave us new data". This is
 * React's documented "adjust state when a prop changes" pattern -- a render-time
 * setState, no effect.
 *
 * Returns `[items, setItems]` like `useState`, plus an optional `onResync`
 * callback invoked with the fresh list whenever it adopts server data (used by
 * managers that also track a reorder `baseline`).
 */
export function useServerSyncedList<T>(
	initial: T[],
	onResync?: (next: T[]) => void,
): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
	const [items, setItems] = useState(initial);
	const [seen, setSeen] = useState(initial);

	if (seen !== initial) {
		setSeen(initial);
		setItems(initial);
		onResync?.(initial);
	}

	return [items, setItems];
}

"use client";

import {
	type CSSProperties,
	useLayoutEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";

/** Column count per breakpoint: 2 on phones, 3 from sm (40rem), 4 from lg (64rem). */
const BREAKPOINTS = [
	{ query: "(min-width: 64rem)", columns: 4 },
	{ query: "(min-width: 40rem)", columns: 3 },
] as const;

/** Horizontal and vertical gutters (px) for each column count. */
const GUTTERS: Record<number, { x: number; y: number }> = {
	2: { x: 12, y: 12 },
	3: { x: 20, y: 20 },
	4: { x: 24, y: 28 },
};

function subscribe(onChange: () => void) {
	const lists = BREAKPOINTS.map(({ query }) => globalThis.matchMedia(query));
	for (const list of lists) list.addEventListener("change", onChange);
	return () => {
		for (const list of lists) list.removeEventListener("change", onChange);
	};
}

function columnsNow(): number {
	for (const { query, columns } of BREAKPOINTS) {
		if (globalThis.matchMedia(query).matches) return columns;
	}
	return 2;
}

/** Grid row unit in px. Heights round up to it, which keeps the implicit row
 *  count far below browser track limits even for a large catalog. */
const ROW_PX = 4;

export interface MasonryPlacement {
	column: number;
	/** First grid row (0-based, in ROW_PX units). */
	top: number;
	/** Rows the item spans (its height in ROW_PX units, rounded up). */
	span: number;
}

/**
 * Greedy shortest-column placement: each item, in catalog order, goes to the
 * column whose bottom is highest. Items stay in DOM (and so focus and
 * screen-reader) order, the first row reads 1, 2, 3, 4 left to right, and the
 * columns end within one item of each other. Pure, so it is cheap to rerun on
 * every filter change and resize.
 */
export function placeMasonry(
	ratios: readonly number[],
	columns: number,
	columnWidth: number,
	extraPx: number,
	gapY: number,
): MasonryPlacement[] {
	const bottoms = Array.from({ length: columns }, () => 0);
	return ratios.map((ratio) => {
		const span = Math.ceil((columnWidth / Math.max(ratio, 0.1) + extraPx) / ROW_PX);
		let column = 0;
		for (let c = 1; c < columns; c++) {
			if ((bottoms[c] ?? 0) < (bottoms[column] ?? 0)) column = c;
		}
		const top = bottoms[column] ?? 0;
		bottoms[column] = top + span + Math.ceil(gapY / ROW_PX);
		return { column, top, span };
	});
}

/**
 * Masonry for a list of paintings at their own aspect ratios. The host is a
 * CSS grid of ROW_PX rows; every item is placed explicitly (grid-column and
 * a row span covering its pixel height), so the wall needs no absolute
 * positioning, the list keeps one DOM order and Motion's layout animation can
 * glide items to their new slots after a filter tap. Heights are exact
 * because the plate height is width / ratio and the caption is fixed
 * (extraPx), so nothing is measured per item: one ResizeObserver on the host.
 */
export function useMasonry<T extends HTMLElement>(
	ratios: readonly number[],
	extraPx: number,
): {
	/** Callback ref for the host, so a host that mounts later (after an empty state) is measured too. */
	hostRef: (node: T | null) => void;
	hostStyle: CSSProperties;
	itemStyle: (index: number) => CSSProperties;
	columnOf: (index: number) => number;
} {
	const columns = useSyncExternalStore(subscribe, columnsNow, () => 2);
	const [width, setWidth] = useState(0);
	const [node, setNode] = useState<T | null>(null);

	useLayoutEffect(() => {
		if (!node) return;
		setWidth(node.clientWidth);
		const observer = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, [node]);

	const gutter = GUTTERS[columns] ?? { x: 12, y: 24 };
	const columnWidth = width > 0 ? (width - gutter.x * (columns - 1)) / columns : 0;
	const placements = useMemo(
		() => placeMasonry(ratios, columns, columnWidth, extraPx, gutter.y),
		[ratios, columns, columnWidth, extraPx, gutter.y],
	);

	const hostStyle: CSSProperties = {
		display: "grid",
		gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
		gridAutoRows: `${ROW_PX}px`,
		columnGap: gutter.x,
		rowGap: 0,
		alignItems: "start",
		// Until the host is measured, hide the first frame rather than flash a stack.
		visibility: width > 0 ? undefined : "hidden",
	};
	const itemStyle = (index: number): CSSProperties => {
		const place = placements[index];
		if (!place) return {};
		return {
			gridColumn: place.column + 1,
			gridRow: `${place.top + 1} / span ${place.span}`,
		};
	};
	return {
		hostRef: setNode,
		hostStyle,
		itemStyle,
		columnOf: (index) => placements[index]?.column ?? 0,
	};
}

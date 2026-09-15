"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import type { Artwork } from "@/lib/types";

/* Local gesture constants (visual-direction 2.4). lib/motion.ts is owned by
 * the foundations lane this window, so these live here; reported for the
 * reviewer. Zoom levels follow the 1600w pixel budget: ~4x of a 358px phone
 * figure, 2.5x of a 640px md figure. */
/** Coarse single-tap debounce before the chrome toggles (owning double-tap
 *  reintroduces the classic tap ambiguity without it). */
const CHROME_TAP_DEBOUNCE_MS = 250;
/** Fine-pointer hover zoom (as built). */
const HOVER_ZOOM_SCALE = 1.8;
/** Coarse double-tap zoom level. */
const TAP_ZOOM_SCALE = 2.5;
/** Pinch cap on phones / from md (the 1600w variant budget). */
const PHONE_ZOOM_MAX = 4;
const MD_ZOOM_MAX = 2.5;
/** Arrow-key pan step while zoomed. */
export const KEYBOARD_PAN_PX = 50;

export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const MD_QUERY = "(min-width: 48rem)";

function maxZoomForViewport(): number {
	return globalThis.matchMedia(MD_QUERY).matches ? MD_ZOOM_MAX : PHONE_ZOOM_MAX;
}

/**
 * The lightbox zoom and touch-gesture cluster (visual-direction 2.4), split
 * out of artwork-lightbox.tsx for the 500-line ceiling: fine-pointer hover
 * pan-zoom, coarse double-tap and pinch with one-finger pan while zoomed,
 * keyboard zoom stops, the debounced single-tap chrome toggle and the 1600w
 * variant warmer. Pure extraction, no behaviour change; the paging/dismiss
 * drag stays with the panel in artwork-lightbox.tsx.
 */
export function useLightboxGestures({
	artwork,
	onToggleChrome,
}: Readonly<{ artwork: Artwork; onToggleChrome: () => void }>) {
	const [level, setLevel] = useState(1);
	const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const zoomed = level > 1;
	const figureRef = useRef<HTMLDivElement>(null);

	// Coarse = no fine hover pointer; drives drag paging and tap gestures.
	const [coarse, setCoarse] = useState(false);
	useEffect(() => {
		const mql = globalThis.matchMedia(FINE_POINTER_QUERY);
		setCoarse(!mql.matches);
		const handler = (e: MediaQueryListEvent) => setCoarse(!e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	// On the first zoom gesture, warm the largest stored variant (2.4).
	const zoomWarmed = useRef<string | null>(null);
	const warmZoomVariant = useCallback(() => {
		if (zoomWarmed.current === artwork.slug) return;
		zoomWarmed.current = artwork.slug;
		const link = document.createElement("link");
		link.rel = "preload";
		link.as = "image";
		link.type = "image/avif";
		link.href = artworkBrowserImageUrl(artwork.image, 1600, "avif");
		document.head.append(link);
	}, [artwork.slug, artwork.image]);

	const resetZoom = useCallback(() => {
		setLevel(1);
		setPan({ x: 0, y: 0 });
		setZoomOrigin({ x: 50, y: 50 });
	}, []);

	// A piece change through any path (arrows, drag, URL, Home/End) lands at
	// fit with the chrome visible (2.4).
	// biome-ignore lint/correctness/useExhaustiveDependencies: artwork.slug keys the reset to piece changes
	useEffect(() => {
		resetZoom();
	}, [artwork.slug, resetZoom]);

	const clampPan = useCallback(
		(value: number, size: number, originPercent: number) => {
			const overflow = (level - 1) * size;
			// Scaling grows each edge away from the actual tap/hover origin.
			const upper = (overflow * originPercent) / 100;
			return Math.min(upper, Math.max(upper - overflow, value));
		},
		[level],
	);
	const panBy = useCallback(
		(dx: number, dy: number) => {
			const rect = figureRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPan((p) => {
				const x = clampPan(p.x + dx, rect.width, zoomOrigin.x);
				const y = clampPan(p.y + dy, rect.height, zoomOrigin.y);
				return x === p.x && y === p.y ? p : { x, y };
			});
		},
		[clampPan, zoomOrigin],
	);

	// Keep an existing pan inside the new bounds when zoom or its origin changes.
	useLayoutEffect(() => {
		panBy(0, 0);
	}, [panBy]);

	/** Keyboard zoom stops: fit, tap level, viewport max (deduped, ordered). */
	const zoomStops = useCallback(() => {
		const cap = maxZoomForViewport();
		return [...new Set([1, TAP_ZOOM_SCALE, cap].filter((stop) => stop <= cap))].sort(
			(a, b) => a - b,
		);
	}, []);
	const zoomIn = useCallback(() => {
		warmZoomVariant();
		const stops = zoomStops();
		const next = stops.find((stop) => stop > level) ?? stops.at(-1) ?? 1;
		setLevel(next);
	}, [level, zoomStops, warmZoomVariant]);
	const zoomOut = useCallback(() => {
		const stops = zoomStops();
		const next = [...stops].reverse().find((stop) => stop < level) ?? 1;
		if (next === 1) resetZoom();
		else setLevel(next);
	}, [level, zoomStops, resetZoom]);

	// --- Coarse taps: single toggles the chrome (debounced), double zooms ---
	const lastTapRef = useRef(0);
	const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
		},
		[],
	);
	const toggleZoomAt = useCallback(
		(clientX: number, clientY: number) => {
			if (zoomed) {
				resetZoom();
				return;
			}
			const rect = figureRef.current?.getBoundingClientRect();
			if (!rect || rect.width === 0 || rect.height === 0) return;
			warmZoomVariant();
			setZoomOrigin({
				x: ((clientX - rect.left) / rect.width) * 100,
				y: ((clientY - rect.top) / rect.height) * 100,
			});
			setLevel(Math.min(TAP_ZOOM_SCALE, maxZoomForViewport()));
		},
		[zoomed, resetZoom, warmZoomVariant],
	);
	const handleTap = useCallback(
		(event: MouseEvent | TouchEvent | PointerEvent) => {
			if (!("pointerType" in event) || event.pointerType !== "touch") return;
			const { clientX, clientY } = event;
			const now = performance.now();
			if (now - lastTapRef.current < CHROME_TAP_DEBOUNCE_MS) {
				lastTapRef.current = 0;
				if (tapTimerRef.current) {
					clearTimeout(tapTimerRef.current);
					tapTimerRef.current = null;
				}
				toggleZoomAt(clientX, clientY);
				return;
			}
			lastTapRef.current = now;
			tapTimerRef.current = setTimeout(() => {
				onToggleChrome();
				tapTimerRef.current = null;
			}, CHROME_TAP_DEBOUNCE_MS);
		},
		[toggleZoomAt, onToggleChrome],
	);

	// --- Pinch (1x..cap) and one-finger pan while zoomed, via pointer events ---
	const pointers = useRef(new Map<number, { x: number; y: number }>());
	const pinchStart = useRef<{ dist: number; level: number } | null>(null);
	const lastTouchTs = useRef(0);
	const pointerDistance = () => {
		const [a, b] = [...pointers.current.values()];
		return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
	};
	const handlePointerDown = (event: React.PointerEvent) => {
		if (event.pointerType !== "touch") return;
		lastTouchTs.current = performance.now();
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.current.size === 2) {
			warmZoomVariant();
			pinchStart.current = { dist: pointerDistance(), level };
		}
	};
	const handlePointerMove = (event: React.PointerEvent) => {
		if (!pointers.current.has(event.pointerId)) return;
		const previous = pointers.current.get(event.pointerId);
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pointers.current.size === 2 && pinchStart.current) {
			const start = pinchStart.current;
			if (start.dist === 0) return;
			const next = Math.min(
				maxZoomForViewport(),
				Math.max(1, start.level * (pointerDistance() / start.dist)),
			);
			setLevel(next);
			if (next === 1) setPan({ x: 0, y: 0 });
			return;
		}
		if (pointers.current.size === 1 && zoomed && previous) {
			panBy(event.clientX - previous.x, event.clientY - previous.y);
		}
	};
	const releasePointer = (event: React.PointerEvent) => {
		pointers.current.delete(event.pointerId);
		if (pointers.current.size < 2) pinchStart.current = null;
	};

	// --- Fine-pointer hover pan-zoom (as built) ---
	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!figureRef.current || !zoomed) return;
			const { left, top, width, height } = figureRef.current.getBoundingClientRect();
			setZoomOrigin({
				x: ((e.clientX - left) / width) * 100,
				y: ((e.clientY - top) / height) * 100,
			});
		},
		[zoomed],
	);
	const handleMouseEnter = useCallback(() => {
		// An emulated mouseenter follows a touch tap; only real hover zooms.
		if (!globalThis.matchMedia(FINE_POINTER_QUERY).matches) return;
		if (performance.now() - lastTouchTs.current < 500) return;
		warmZoomVariant();
		setLevel(HOVER_ZOOM_SCALE);
	}, [warmZoomVariant]);
	const handleMouseLeave = useCallback(() => {
		if (globalThis.matchMedia(FINE_POINTER_QUERY).matches) resetZoom();
	}, [resetZoom]);

	return {
		coarse,
		level,
		zoomed,
		zoomOrigin,
		pan,
		figureRef,
		resetZoom,
		panBy,
		zoomIn,
		zoomOut,
		handleTap,
		handlePointerDown,
		handlePointerMove,
		releasePointer,
		handleMouseMove,
		handleMouseEnter,
		handleMouseLeave,
	};
}

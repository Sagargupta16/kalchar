"use client";

import { useEffect } from "react";

/** Fallback delay before loading Lenis when requestIdleCallback is absent. */
const IDLE_FALLBACK_DELAY_MS = 200;

export function SmoothScroll() {
	useEffect(() => {
		if (typeof globalThis.window === "undefined") return;
		if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (!globalThis.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

		let cancelled = false;
		let destroy: (() => void) | null = null;

		async function start() {
			if (cancelled) return;
			try {
				const { default: Lenis } = await import("lenis");
				if (cancelled) return;
				const lenis = new Lenis({
					duration: 1.1,
					easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
					touchMultiplier: 0,
				});
				let raf = 0;
				const tick = (time: number) => {
					lenis.raf(time);
					raf = globalThis.requestAnimationFrame(tick);
				};
				raf = globalThis.requestAnimationFrame(tick);
				destroy = () => {
					globalThis.cancelAnimationFrame(raf);
					lenis.destroy();
				};
			} catch {
				// Network blip / CSP -- native scroll is fine.
			}
		}

		let cancelSchedule: () => void;
		if (typeof globalThis.requestIdleCallback === "function") {
			const idleHandle = globalThis.requestIdleCallback(() => start());
			cancelSchedule = () => globalThis.cancelIdleCallback(idleHandle);
		} else {
			const timeoutHandle = globalThis.setTimeout(start, IDLE_FALLBACK_DELAY_MS);
			cancelSchedule = () => globalThis.clearTimeout(timeoutHandle);
		}

		return () => {
			cancelled = true;
			if (destroy) destroy();
			cancelSchedule();
		};
	}, []);

	return null;
}

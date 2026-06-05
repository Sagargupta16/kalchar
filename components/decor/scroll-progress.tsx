"use client";

import { useEffect, useState } from "react";

/**
 * ScrollProgress -- thin gradient bar at the top of the viewport that
 * scales with how far the visitor has scrolled. Cycles through all five
 * section pigments (vermillion -> marigold -> pichwai -> peacock -> ruby)
 * so the bar visually traverses the same chromatic arc as the page beneath.
 * Pure cosmetic; sits above the page chrome at z-50. No animation if the
 * bar isn't moving, so reduced-motion users see the same final state at
 * every scroll point.
 */
export function ScrollProgress() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let ticking = false;
		function onScroll() {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				const max = document.documentElement.scrollHeight - globalThis.innerHeight;
				setProgress(max > 0 ? globalThis.scrollY / max : 0);
				ticking = false;
			});
		}
		onScroll();
		globalThis.addEventListener("scroll", onScroll, { passive: true });
		globalThis.addEventListener("resize", onScroll);
		return () => {
			globalThis.removeEventListener("scroll", onScroll);
			globalThis.removeEventListener("resize", onScroll);
		};
	}, []);

	return (
		<div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 h-[3px] w-full">
			<div
				className="h-full origin-left"
				style={{
					transform: `scaleX(${progress})`,
					background:
						"linear-gradient(90deg, var(--color-vermillion), var(--color-marigold), var(--color-pichwai), var(--color-peacock), var(--color-ruby))",
					transition: "transform 150ms linear",
				}}
			/>
		</div>
	);
}

"use client";

import { useEffect, useState } from "react";

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
		return () => globalThis.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 h-[2px] w-full">
			<div
				className="h-full origin-left bg-accent"
				style={{
					transform: `scaleX(${progress})`,
					transition: "transform 150ms linear",
				}}
			/>
		</div>
	);
}

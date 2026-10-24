"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
	value: number;
	/** Where the count starts (a year counts up from a few decades back, not from zero). */
	from?: number;
	className?: string;
	/** Total run in ms; the curve is a quartic ease-out so the last digits settle slowly. */
	durationMs?: number;
	/** Extra wait after the number scrolls in (a row of stats can ripple). */
	delayMs?: number;
}

/**
 * A numeral that counts up from zero the first time it scrolls into view.
 * The server HTML carries the final value (SEO, no-JS, screen readers that
 * read the page before it scrolls); the element is fixed to the final
 * value's width in ch, so the count never nudges the
 * line. Text only: nothing is laid out again while it runs.
 */
export function CountUp({
	value,
	from = 0,
	className,
	durationMs = 1400,
	delayMs = 0,
}: Readonly<CountUpProps>) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const node = ref.current;
		if (!node || value <= from || typeof IntersectionObserver === "undefined") return;
		let frame = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const run = () => {
			const start = performance.now();
			const tick = (now: number) => {
				const t = Math.min((now - start) / durationMs, 1);
				const eased = 1 - (1 - t) ** 4;
				node.textContent = String(Math.round(from + eased * (value - from)));
				if (t < 1) frame = requestAnimationFrame(tick);
			};
			node.textContent = String(from);
			frame = requestAnimationFrame(tick);
		};
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				observer.disconnect();
				timer = setTimeout(run, delayMs);
			},
			{ rootMargin: "0px 0px -8% 0px" },
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
			if (timer) clearTimeout(timer);
			cancelAnimationFrame(frame);
			node.textContent = String(value);
		};
	}, [value, from, durationMs, delayMs]);

	return (
		<span
			ref={ref}
			className={cn("inline-block", className)}
			style={{ minWidth: `${String(value).length}ch` }}
		>
			{value}
		</span>
	);
}

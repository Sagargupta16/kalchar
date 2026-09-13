"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface EnquiryBarProps {
	/** Formatted price, omitted for archive pieces. */
	price?: string;
	href: string;
	label: string;
	/** id of the in-column CTA panel; the bar shows only while that panel is off screen. */
	watchId: string;
}

/** Phone-only sticky enquiry bar (md:hidden). Visible while the in-column CTA panel is
 *  outside the viewport and the page end has not been reached; carries the SAME
 *  wa.me link as the panel, never a scroll-to. Publishes its height as --fixed-bar-h
 *  on <html> so the back-to-top control can move above it (chrome handover). */
export function EnquiryBar({ price, href, label, watchId }: Readonly<EnquiryBarProps>) {
	const [panelVisible, setPanelVisible] = useState(true);
	const [endVisible, setEndVisible] = useState(false);
	const endRef = useRef<HTMLSpanElement>(null);
	const barRef = useRef<HTMLDivElement>(null);
	const reduceMotion = usePrefersReducedMotion();
	const visible = !panelVisible && !endVisible;

	useEffect(() => {
		const panel = document.getElementById(watchId);
		const end = endRef.current;
		if (!panel || !end) return;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === panel) setPanelVisible(entry.isIntersecting);
				else setEndVisible(entry.isIntersecting);
			}
		});
		observer.observe(panel);
		observer.observe(end);
		return () => observer.disconnect();
	}, [watchId]);

	useEffect(() => {
		const root = document.documentElement;
		const bar = barRef.current;
		const phoneLayout = globalThis.matchMedia("(max-width: 47.9375rem)").matches;
		if (visible && bar && phoneLayout) {
			root.style.setProperty("--fixed-bar-h", `${bar.offsetHeight}px`);
		} else {
			root.style.removeProperty("--fixed-bar-h");
		}
		return () => {
			root.style.removeProperty("--fixed-bar-h");
		};
	}, [visible]);

	return (
		<>
			<span ref={endRef} aria-hidden="true" className="pointer-events-none block h-px w-px" />
			<div
				ref={barRef}
				inert={!visible || undefined}
				aria-hidden={!visible}
				className={cn(
					"fixed inset-x-0 bottom-0 z-nav border-t border-line bg-surface-raised/95 pb-safe-bottom backdrop-blur md:hidden",
					"transition-[opacity,translate] duration-(--duration-base) ease-(--ease-out)",
					visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
					reduceMotion && "transition-none",
				)}
			>
				<div className="flex items-center justify-between gap-3 px-(--container-px) py-3">
					{price ? (
						<div className="min-w-0">
							<span className="t-meta block normal-case tracking-normal">Price</span>
							<span className="t-display block whitespace-nowrap text-xl text-accent-text tabular-nums">
								{price}
							</span>
						</div>
					) : null}
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							buttonVariants({ variant: "primary" }),
							"min-w-0 flex-1 whitespace-normal text-center",
						)}
					>
						<MessageCircle size={16} aria-hidden="true" />
						{label}
					</a>
				</div>
			</div>
		</>
	);
}

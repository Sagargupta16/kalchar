"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

/**
 * Routes that carry the floating disc (visual-direction 2.14). Everything else
 * is excluded on purpose: /work/[slug] (the EnquiryBar owns that zone),
 * /custom-orders (the form's submit is the action), /contact (the page is the
 * action) and /admin (its own chrome). Keys are pathnames with the trailing
 * slash stripped; "" is the home page.
 */
const FAB_ROUTES = new Set(["", "/work", "/about", "/events", "/workshops", "/trust"]);

interface EnquireFabProps {
	whatsappHref: string;
}

/**
 * Floating WhatsApp disc (the Instagram-native graft, visual-direction 2.14):
 * a 56px terracotta circle pinned to the bottom-right, one thumb-reach away on
 * every page that has no price bar of its own. Hidden until the visitor
 * scrolls past roughly one viewport (the same sentinel pattern as BackToTop)
 * and while the footer's channel row ([data-channel-row]) is on screen, so it
 * never covers the very links it duplicates. Stays mounted on eligible routes
 * while hidden (inert, so it leaves the tab order and the a11y tree): the
 * html:has([data-enquire-fab]) rule keys off DOM presence to
 * lift BackToTop one FAB slot, and unmount-on-hide would make that offset
 * jump. Enters at DUR.base ease-out and exits at DUR.fast ease-in.
 *
 * Steering 2026-09-14: the disc face is a nested span so the visuals never
 * fight the anchor's own transforms (pressable presses the anchor; show/hide
 * travel rides the separate translate property). The face carries the
 * restrained accent material: accent tint at 90% fill over static backdrop
 * blur + saturate (solid accent without backdrop-filter; hover goes solid
 * accent-hover, an affordance and a contrast floor in one), a bg-tinted
 * hairline, and the e3 layered shadow. It also breathes on .plate-float, a
 * 3px half-cycle every 7s: slow enough to read as idle life, not a bid for
 * attention; paused while the disc is hidden.
 */
export function EnquireFab({ whatsappHref }: Readonly<EnquireFabProps>) {
	const pathname = usePathname();
	const [scrolledPast, setScrolledPast] = useState(false);
	const [channelsInView, setChannelsInView] = useState(false);
	const sentinelRef = useRef<HTMLSpanElement>(null);

	const eligible = FAB_ROUTES.has((pathname ?? "").replace(/\/+$/, ""));

	useEffect(() => {
		if (!eligible) return;
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry?.isIntersecting));
		observer.observe(sentinel);
		const channels = document.querySelector("[data-channel-row]");
		const channelObserver = channels
			? new IntersectionObserver(([entry]) => setChannelsInView(Boolean(entry?.isIntersecting)))
			: null;
		if (channels && channelObserver) channelObserver.observe(channels);
		return () => {
			observer.disconnect();
			channelObserver?.disconnect();
		};
	}, [eligible]);

	if (!eligible) return null;

	const shown = scrolledPast && !channelsInView;

	return (
		<>
			{/* 1px inside the first viewport: intersecting at load, gone once the
			    visitor has scrolled about one screen. */}
			<span
				ref={sentinelRef}
				aria-hidden="true"
				className="pointer-events-none absolute left-0 top-[calc(100vh-1px)] h-px w-px"
			/>
			<a
				data-enquire-fab=""
				href={whatsappHref}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Message on WhatsApp"
				inert={shown ? undefined : true}
				className={cn(
					"group fixed z-fab size-fab rounded-full text-bg transition-[opacity,translate] pressable",
					"bottom-[calc(var(--spacing-safe-bottom)+--spacing(5)+var(--fixed-bar-h,0px))] right-[calc(var(--spacing-safe-right)+--spacing(5))]",
					shown
						? "pointer-events-auto opacity-100 duration-(--duration-base) ease-(--ease-out)"
						: "pointer-events-none opacity-0 duration-(--duration-fast) ease-(--ease-in)",
					shown ? "translate-y-0" : "translate-y-2",
				)}
			>
				<span
					className="plate-float grid size-full place-items-center rounded-full border border-bg/30 bg-accent shadow-e3 backdrop-blur-(--glass-blur) backdrop-saturate-(--glass-saturate) transition-colors supports-[backdrop-filter]:bg-accent/90 group-hover:bg-accent-hover"
					style={
						{
							"--float-travel": "3px",
							"--float-state": shown ? "running" : "paused",
						} as CSSProperties
					}
				>
					<WhatsAppIcon className="size-6" aria-hidden="true" />
				</span>
			</a>
		</>
	);
}

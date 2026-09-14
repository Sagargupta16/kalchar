"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
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
 * jump. Enters at DUR.base ease-out, exits at DUR.fast ease-in; reduced
 * motion drops the travel and keeps the fade.
 */
export function EnquireFab({ whatsappHref }: Readonly<EnquireFabProps>) {
	const pathname = usePathname();
	const [scrolledPast, setScrolledPast] = useState(false);
	const [channelsInView, setChannelsInView] = useState(false);
	const sentinelRef = useRef<HTMLSpanElement>(null);
	const reduceMotion = usePrefersReducedMotion();

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
					"fixed z-fab grid size-fab place-items-center rounded-full bg-accent text-bg shadow-e3 transition-[opacity,translate] pressable hover:bg-accent-hover",
					"bottom-[calc(var(--spacing-safe-bottom)+--spacing(5)+var(--fixed-bar-h,0px))] right-[calc(var(--spacing-safe-right)+--spacing(5))]",
					shown
						? "pointer-events-auto opacity-100 duration-(--duration-base) ease-(--ease-out)"
						: "pointer-events-none opacity-0 duration-(--duration-fast) ease-(--ease-in)",
					!reduceMotion && (shown ? "translate-y-0" : "translate-y-2"),
				)}
			>
				<WhatsAppIcon className="size-6" aria-hidden="true" />
			</a>
		</>
	);
}

"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal -- a fade-up wrapper used across home + page sections.
 *
 * The first time the element enters the viewport, it fades in and lifts
 * 16px. Subsequent scrolls don't replay (`once: true`). When the user has
 * `prefers-reduced-motion`, Motion's library-level handling (configured by
 * <MotionConfig reducedMotion="user"> in the root layout) skips transitions
 * and renders the final state -- we don't branch on a hook value here
 * because doing so produces a different React tree shape on server vs.
 * client and breaks hydration.
 *
 * No-JS / crawler fallback: SSR markup ships with inline `opacity:0`, which
 * means JS-blocked visitors would see blank pages. The `<noscript>` style
 * block in app/layout.tsx unhides any element with `opacity:0` so content
 * remains visible without JS. (Caveat: Motion-bundle-load failure on a
 * JS-enabled client still leaves content hidden -- accepted trade-off.)
 *
 * `delayMs` is the entry delay (ms). Use in lists for a small stagger
 * (e.g. `delayMs={index * 60}`).
 *
 * `eager` -- animate on mount via CSS instead of Motion's scroll-triggered
 * `whileInView`. Use for ABOVE-THE-FOLD content (hero, page headers, the
 * featured LCP image). A scroll-triggered Reveal ships `opacity:0` and stays
 * invisible until the Motion JS bundle hydrates -- on a throttled mobile
 * connection that's seconds, and it makes the LCP element paint late. Eager
 * mode renders plain markup with a CSS keyframe (`.reveal-eager`) that runs
 * as soon as the render-blocking stylesheet loads, so the content is visible
 * at first paint with no JS dependency. Reduced motion + no-JS are handled in
 * the stylesheet, so eager elements don't need the `<noscript>` net.
 */
interface RevealProps {
	children: ReactNode;
	delayMs?: number;
	className?: string;
	/** Tag to render. Defaults to a div. */
	as?: "div" | "section" | "article" | "li" | "h1" | "h2" | "h3" | "p";
	/** Animate on mount via CSS (above-the-fold), not scroll-triggered. */
	eager?: boolean;
}

export function Reveal({
	children,
	delayMs = 0,
	className,
	as = "div",
	eager = false,
}: Readonly<RevealProps>) {
	if (eager) {
		const Tag = as;
		return (
			<Tag className={cn("reveal-eager", className)} style={{ animationDelay: `${delayMs}ms` }}>
				{children}
			</Tag>
		);
	}

	const Tag = motion[as];
	return (
		<Tag
			className={className}
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "0px 0px -10% 0px" }}
			transition={{
				duration: 0.4,
				ease: [0.16, 1, 0.3, 1],
				delay: delayMs / 1000,
			}}
		>
			{children}
		</Tag>
	);
}

"use client";

import { motion, useInView } from "motion/react";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { DUR, LOOP_MOUNT_MARGIN, perSegmentEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Organic pigment wash (visual-direction 1.6 item 4): two absolutely
 * positioned ellipses reading the --wash-a (section pigment) and --wash-b
 * (marigold) tokens, radial stops at 0 / 45% / 70% transparent, softened by a
 * mask-image radial fade -- never a blur filter. Multiply blend on paper, plain
 * alpha in dark. The host must be `relative overflow-hidden [contain:paint]`
 * (Section's `wash` prop provides it).
 *
 * `drift` (default) runs [from, to, from] transform keyframe loops over 30s
 * and 40s with one ease per segment, mounted only while the host is near the
 * viewport (LOOP_MOUNT_MARGIN) so document.getAnimations() drains once the
 * visitor scrolls past. Reduced motion and drift={false} render the identical
 * wash, static -- the ellipses stay visible.
 */

const DRIFT_TIMES = [0, 0.5, 1];

/** Ellipse B drifts over 40s against A's 30s so the washes never sync (spec 1.6 item 4). */
const DRIFT_B_SECONDS = 40;

/** Travel in px, matching the landed hero-wash recipe (motion addendum H3). */
const DRIFT_A = { x: [-40, 40, -40], y: [0, 24, 0], scale: [1, 1.06, 1] };
/** Counter-phase so the two washes never read as one moving sheet. */
const DRIFT_B = { x: [32, -32, 32], y: [16, -12, 16], scale: [1.04, 1, 1.04] };

/** Section-pigment ellipse, 60vw x 40vw at the top right. */
const WASH_A_STYLE = {
	background: "radial-gradient(closest-side, var(--wash-a) 0%, var(--wash-a) 45%, transparent 70%)",
	maskImage: "radial-gradient(closest-side, black, transparent)",
} as const satisfies CSSProperties;
/** Marigold ellipse, 45vw x 30vw at the bottom left. */
const WASH_B_STYLE = {
	background: "radial-gradient(closest-side, var(--wash-b) 0%, var(--wash-b) 45%, transparent 70%)",
	maskImage: "radial-gradient(closest-side, black, transparent)",
} as const satisfies CSSProperties;

const WASH_A_CLASS =
	"absolute -top-[10vw] -right-[12vw] h-[40vw] w-[60vw] rounded-full mix-blend-multiply dark:mix-blend-normal";
const WASH_B_CLASS =
	"absolute -bottom-[8vw] -left-[10vw] h-[30vw] w-[45vw] rounded-full mix-blend-multiply dark:mix-blend-normal";

interface PigmentWashProps {
	/** Animate the slow drift (default). Footers and closing CTAs pass false for a static wash. */
	drift?: boolean;
	className?: string;
}

export function PigmentWash({ drift = true, className }: Readonly<PigmentWashProps>) {
	const ref = useRef<HTMLDivElement>(null);
	const inView = useInView(ref, { margin: LOOP_MOUNT_MARGIN });
	const reduceMotion = usePrefersReducedMotion();
	const animate = drift && inView && !reduceMotion;

	return (
		<div
			ref={ref}
			aria-hidden="true"
			className={cn("pointer-events-none absolute inset-0 -z-10", className)}
		>
			{animate ? (
				<>
					<motion.div
						className={WASH_A_CLASS}
						style={WASH_A_STYLE}
						animate={DRIFT_A}
						transition={{
							duration: DUR.drift,
							times: DRIFT_TIMES,
							ease: perSegmentEase(DRIFT_TIMES),
							repeat: Number.POSITIVE_INFINITY,
						}}
					/>
					<motion.div
						className={WASH_B_CLASS}
						style={WASH_B_STYLE}
						animate={DRIFT_B}
						transition={{
							duration: DRIFT_B_SECONDS,
							times: DRIFT_TIMES,
							ease: perSegmentEase(DRIFT_TIMES),
							repeat: Number.POSITIVE_INFINITY,
						}}
					/>
				</>
			) : (
				<>
					<div className={WASH_A_CLASS} style={WASH_A_STYLE} />
					<div className={WASH_B_CLASS} style={WASH_B_STYLE} />
				</>
			)}
		</div>
	);
}

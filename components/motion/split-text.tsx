"use client";

/**
 * Character-by-character entrance for the hero lead.
 *
 * Each character renders as a span with a CSS animation that fades + lifts
 * in sequence via computed `animation-delay`. Previous implementation used
 * 80+ individual Motion `<motion.span>` elements, each running a JS-driven
 * spring solver -- this caused INP spikes on mid-range Android devices during
 * hero load. CSS animations offload the work to the compositor thread.
 *
 * Reduced-motion: the global `MotionConfig reducedMotion="user"` doesn't
 * reach raw CSS animations, so we use a CSS media query in the keyframe
 * declaration (in globals.css) to collapse the animation to instant.
 *
 * `startDelayMs` offsets the first character so the text entrance sequences
 * after the headline Reveal above it finishes.
 */
interface SplitTextProps {
	text: string;
	className?: string;
	startDelayMs?: number;
}

export function SplitText({ text, className, startDelayMs = 0 }: Readonly<SplitTextProps>) {
	const chars = Array.from(text);
	return (
		<span className={className}>
			{chars.map((ch, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: stable position-based split
					key={`${i}-${ch}`}
					className="split-char inline-block"
					style={{
						animationDelay: `${startDelayMs + i * 8}ms`,
					}}
				>
					{ch === " " ? " " : ch}
				</span>
			))}
		</span>
	);
}

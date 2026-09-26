"use client";

import { useMotionValueEvent, useScroll, useSpring, useVelocity } from "motion/react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { BinduMark } from "@/components/decor/bindu-mark";
import { MARQUEE_VELOCITY, SPRING_VELOCITY } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Below this many names the loop repeats the list so one track still spans a wide screen. */
const MIN_ITEMS = 6;
/** Rate changes smaller than this are not worth re-syncing the compositor animation. */
const RATE_EPSILON = 0.05;
/** Loop iterations of headroom kept behind the playhead so reversed playback never reaches time 0. */
const REVERSE_HEADROOM_LOOPS = 200;

/**
 * A reversed animation that reaches currentTime 0 drops into its before phase
 * and stops painting (a negative animation-delay does not help: the boundary
 * clamps at 0). Every iteration is identical, so jumping the playhead forward
 * by whole loops is invisible and keeps the band reversible indefinitely.
 */
function keepReversible(animation: Animation) {
	const loop = Number(animation.effect?.getComputedTiming().duration);
	const now = Number(animation.currentTime ?? 0);
	if (!Number.isFinite(loop) || loop <= 0 || now > loop) return;
	animation.currentTime = now + loop * REVERSE_HEADROOM_LOOPS;
}

interface StyleMarqueeProps {
	styles: readonly string[];
}

function fillTrack(styles: readonly string[]): { id: string; name: string }[] {
	if (styles.length === 0) return [];
	const rounds = Math.ceil(Math.max(MIN_ITEMS, styles.length) / styles.length);
	return Array.from({ length: rounds }, (_, round) =>
		styles.map((name) => ({ id: `${round}:${name}`, name })),
	).flat();
}

/**
 * The home style band between the hero and Selected Work: every art style in
 * the display serif at poster scale, roman and italic alternating, separated
 * by the bindu mark, each a link to /work?style=X. The loop is CSS
 * (components/decor/marquee.css); scroll velocity speeds it up and scrolling
 * up reverses it by nudging the animation's playbackRate, so the band answers
 * the reader's scroll without a per-frame JS transform. Hover or focus
 * pauses; offscreen it stops. The second track is a visual duplicate, inert
 * and hidden from assistive tech, so the six links are announced once.
 */
export function StyleMarquee({ styles }: Readonly<StyleMarqueeProps>) {
	const rootRef = useRef<HTMLElement>(null);
	const animations = useRef<Animation[]>([]);
	const direction = useRef(1);
	const lastRate = useRef(1);
	const [inView, setInView] = useState(false);
	const { scrollY } = useScroll();
	const velocity = useSpring(useVelocity(scrollY), SPRING_VELOCITY);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		animations.current = root
			.getAnimations({ subtree: true })
			.filter((a) => a instanceof CSSAnimation && a.animationName === "marquee-scroll");
		for (const animation of animations.current) keepReversible(animation);
		const observer = new IntersectionObserver(([entry]) =>
			setInView(entry?.isIntersecting ?? false),
		);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useMotionValueEvent(velocity, "change", (latest) => {
		if (!inView) return;
		if (Math.abs(latest) > MARQUEE_VELOCITY.directionDeadbandPx)
			direction.current = latest < 0 ? -1 : 1;
		const boost = Math.abs(latest) / MARQUEE_VELOCITY.pxPerSecondPerStep;
		const rate = direction.current * Math.min(1 + boost, MARQUEE_VELOCITY.maxRate);
		if (Math.abs(rate - lastRate.current) < RATE_EPSILON) return;
		lastRate.current = rate;
		for (const animation of animations.current) {
			keepReversible(animation);
			animation.updatePlaybackRate(rate);
		}
	});

	const items = fillTrack(styles);
	if (items.length === 0) return null;

	const track = (duplicate: boolean) => (
		<ul
			className="marquee__track"
			aria-hidden={duplicate || undefined}
			inert={duplicate || undefined}
		>
			{items.map((item, i) => (
				<li key={item.id} className="marquee__item">
					<Link
						href={`/work?style=${encodeURIComponent(item.name)}`}
						tabIndex={duplicate ? -1 : undefined}
						className={cn(
							"type-marquee inline-flex min-h-control items-center rounded-(--radius-sm) font-display whitespace-nowrap transition-colors",
							i % 2 === 0
								? "font-semibold text-ink hover:text-accent-text"
								: "font-medium text-accent-text italic hover:text-ink",
						)}
					>
						{item.name}
					</Link>
					<BinduMark className="h-3 w-6 text-accent md:h-4 md:w-8" />
				</li>
			))}
		</ul>
	);

	return (
		<nav
			ref={rootRef}
			aria-label="Art styles"
			className="border-y border-line py-5 md:py-8"
			style={{ "--marquee-state": inView ? "running" : "paused" } as CSSProperties}
		>
			<div className="marquee">
				{track(false)}
				{track(true)}
			</div>
		</nav>
	);
}

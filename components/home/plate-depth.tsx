"use client";

import { type MotionValue, motion, useScroll, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
	HERO_SCROLL_PARALLAX,
	HERO_SCROLL_RANGE_PX,
	PARALLAX_SPRING,
	PLATE_PARALLAX_DEPTH,
	TILT_MAX_DEG,
	TILT_PERSPECTIVE_PX,
} from "@/lib/motion";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
/** The back plate answers the pointer at 60% of the front's tilt, so the pair reads as two depths. */
const BACK_TILT_SHARE = 0.6;
const SCROLL_RANGE = [0, HERO_SCROLL_RANGE_PX];

export interface LayerMotion {
	x: MotionValue<number>;
	y: MotionValue<number>;
	rotate: MotionValue<number>;
	rotateX: MotionValue<number>;
	rotateY: MotionValue<number>;
}

/**
 * Scroll and pointer depth for the hero plate pair.
 *
 * Scroll (every device): over the first HERO_SCROLL_RANGE_PX of page scroll
 * the front plate rises 80px and turns 4deg while the back rises 40px and
 * turns the other way, so the pair separates as the hero leaves.
 *
 * Pointer (fine pointers only, while the hero is on screen): the cursor's
 * position over the window tilts the front plate up to TILT_MAX_DEG and
 * drifts it PLATE_PARALLAX_DEPTH px; the back follows shallower. Transform
 * only; the springs settle back to rest when the pointer leaves the page.
 */
export function usePlateDepth(active: boolean): { front: LayerMotion; back: LayerMotion } {
	const { scrollY } = useScroll();
	const pointerX = useSpring(0, PARALLAX_SPRING);
	const pointerY = useSpring(0, PARALLAX_SPRING);

	useEffect(() => {
		if (!active || !globalThis.matchMedia(FINE_POINTER_QUERY).matches) return;
		const onMove = (event: PointerEvent) => {
			pointerX.set((event.clientX / globalThis.innerWidth) * 2 - 1);
			pointerY.set((event.clientY / globalThis.innerHeight) * 2 - 1);
		};
		const rest = () => {
			pointerX.set(0);
			pointerY.set(0);
		};
		const root = document.documentElement;
		globalThis.addEventListener("pointermove", onMove, { passive: true });
		root.addEventListener("pointerleave", rest);
		return () => {
			globalThis.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerleave", rest);
			rest();
		};
	}, [active, pointerX, pointerY]);

	const frontRise = useTransform(scrollY, SCROLL_RANGE, [0, HERO_SCROLL_PARALLAX.front.y]);
	const backRise = useTransform(scrollY, SCROLL_RANGE, [0, HERO_SCROLL_PARALLAX.back.y]);
	const front: LayerMotion = {
		x: useTransform(() => pointerX.get() * PLATE_PARALLAX_DEPTH.front),
		y: useTransform(() => frontRise.get() + pointerY.get() * PLATE_PARALLAX_DEPTH.front),
		rotate: useTransform(scrollY, SCROLL_RANGE, [0, HERO_SCROLL_PARALLAX.front.rotate]),
		rotateX: useTransform(() => pointerY.get() * -TILT_MAX_DEG),
		rotateY: useTransform(() => pointerX.get() * TILT_MAX_DEG),
	};
	const back: LayerMotion = {
		x: useTransform(() => pointerX.get() * PLATE_PARALLAX_DEPTH.back),
		y: useTransform(() => backRise.get() + pointerY.get() * PLATE_PARALLAX_DEPTH.back),
		rotate: useTransform(scrollY, SCROLL_RANGE, [0, HERO_SCROLL_PARALLAX.back.rotate]),
		rotateX: useTransform(() => pointerY.get() * -TILT_MAX_DEG * BACK_TILT_SHARE),
		rotateY: useTransform(() => pointerX.get() * TILT_MAX_DEG * BACK_TILT_SHARE),
	};
	return { front, back };
}

/**
 * The parallax node, nested between the shuffle tilt (.hero-plate, a CSS
 * transition) and the idle float (.plate-float, a CSS loop): one transform
 * owner per node, so none of the three fights another.
 */
export function ParallaxLayer({
	layer,
	children,
}: Readonly<{ layer: LayerMotion; children: ReactNode }>) {
	return (
		<motion.div className="h-full" style={{ ...layer, transformPerspective: TILT_PERSPECTIVE_PX }}>
			{children}
		</motion.div>
	);
}

"use client";

import { motion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { SPRING_ZOOM, TILT_MAX_DEG, TILT_PERSPECTIVE_PX } from "@/lib/motion";

/**
 * TiltPlate -- pointer-tied 3D tilt for art plates (visual-direction 1.7).
 * Wraps a whole card so frame, shadow and caption rotate together; rotateX/Y
 * ride SPRING_ZOOM within `maxDeg` (TILT_MAX_DEG by default; grid cards pass
 * CARD_TILT_MAX_DEG) at TILT_PERSPECTIVE_PX. Mounts only on `(hover: hover)
 * and (pointer: fine)` devices; phones get the children unchanged. The host
 * grid carries overflow-x: clip so a mid-tilt corner never widens the page.
 */

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

interface TiltPlateProps {
	children: ReactNode;
	className?: string;
	/** Peak rotation in degrees at the plate's edge. */
	maxDeg?: number;
}

export function TiltPlate({
	children,
	className,
	maxDeg = TILT_MAX_DEG,
}: Readonly<TiltPlateProps>) {
	const [finePointer, setFinePointer] = useState(false);
	const rotateX = useSpring(0, SPRING_ZOOM);
	const rotateY = useSpring(0, SPRING_ZOOM);

	useEffect(() => {
		const mql = globalThis.matchMedia(FINE_POINTER_QUERY);
		setFinePointer(mql.matches);
		const handler = (e: MediaQueryListEvent) => setFinePointer(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	if (!finePointer) return <>{children}</>;

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
		const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
		rotateY.set(ratioX * 2 * maxDeg);
		rotateX.set(ratioY * -2 * maxDeg);
	};

	const rest = () => {
		rotateX.set(0);
		rotateY.set(0);
	};

	return (
		<motion.div
			className={className}
			style={{ rotateX, rotateY, transformPerspective: TILT_PERSPECTIVE_PX }}
			onPointerMove={handlePointerMove}
			onPointerLeave={rest}
			onPointerCancel={rest}
		>
			{children}
		</motion.div>
	);
}

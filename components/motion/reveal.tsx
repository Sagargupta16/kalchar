"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { DUR, EASE_OUT, REVEAL_VIEWPORT_MARGIN } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealProps {
	children: ReactNode;
	delayMs?: number;
	className?: string;
	as?: "div" | "section" | "article" | "li" | "h1" | "h2" | "h3" | "p" | "header" | "aside";
	eager?: boolean;
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
	/** plate = clip-path unveil for artwork plates (the image is never resampled). */
	variant?: "up" | "plate";
	/** Slower single-plate unveil (700ms, --ease-emphatic) on the eager plate path. */
	unveil?: boolean;
}

const DIR = { up: "Y", down: "Y", left: "X", right: "X" } as const;
const SIGN = { up: 1, down: -1, left: 1, right: -1 } as const;

export function Reveal({
	children,
	delayMs = 0,
	className,
	as = "div",
	eager = false,
	direction = "up",
	distance = 20,
	variant = "up",
	unveil = false,
}: Readonly<RevealProps>) {
	const reduceMotion = usePrefersReducedMotion();
	const plate = variant === "plate";
	if (reduceMotion) {
		// Plates included: clip-path none, plain presence.
		const Tag = as;
		return <Tag className={className}>{children}</Tag>;
	}

	if (eager) {
		const Tag = as;
		return (
			<Tag
				className={cn(
					plate ? cn("reveal-plate", unveil && "reveal-plate-unveil") : "reveal-up",
					className,
				)}
				style={{ animationDelay: `${delayMs}ms` }}
			>
				{children}
			</Tag>
		);
	}

	const Tag = motion[as];
	const axis = DIR[direction];
	const offset = SIGN[direction] * distance;
	// Plates clip-unveil at final size (never resampled); everything else fades up.
	const initial = plate
		? { clipPath: "inset(0% 0% 100% 0%)" }
		: { opacity: 0, [`translate${axis}`]: offset };
	const animate = plate
		? { clipPath: "inset(0% 0% 0% 0%)" }
		: { opacity: 1, translateX: 0, translateY: 0 };

	return (
		<Tag
			data-motion-reveal
			className={className}
			initial={initial}
			whileInView={animate}
			viewport={{ once: true, margin: REVEAL_VIEWPORT_MARGIN }}
			transition={{
				duration: plate ? DUR.slow : DUR.enter,
				ease: EASE_OUT,
				delay: delayMs / 1000,
			}}
		>
			{children}
		</Tag>
	);
}

"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface RevealProps {
	children: ReactNode;
	delayMs?: number;
	className?: string;
	as?: "div" | "section" | "article" | "li" | "h1" | "h2" | "h3" | "p" | "header" | "aside";
	eager?: boolean;
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
}

const DIR = { up: "Y", down: "Y", left: "X", right: "X" } as const;
const SIGN = { up: 1, down: -1, left: 1, right: -1 } as const;
const REVEAL_DURATION_SECONDS = 0.5;
const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
	children,
	delayMs = 0,
	className,
	as = "div",
	eager = false,
	direction = "up",
	distance = 20,
}: Readonly<RevealProps>) {
	const reduceMotion = usePrefersReducedMotion();
	if (reduceMotion) {
		const Tag = as;
		return <Tag className={className}>{children}</Tag>;
	}

	if (eager) {
		const Tag = as;
		return (
			<Tag className={cn("reveal-up", className)} style={{ animationDelay: `${delayMs}ms` }}>
				{children}
			</Tag>
		);
	}

	const Tag = motion[as];
	const axis = DIR[direction];
	const offset = SIGN[direction] * distance;
	const initial = { opacity: 0, [`translate${axis}`]: offset };
	const animate = { opacity: 1, translateX: 0, translateY: 0 };

	return (
		<Tag
			data-motion-reveal
			className={className}
			initial={initial}
			whileInView={animate}
			viewport={{ once: true, margin: "0px 0px -80px 0px" }}
			transition={{
				duration: REVEAL_DURATION_SECONDS,
				ease: REVEAL_EASE,
				delay: delayMs / 1000,
			}}
		>
			{children}
		</Tag>
	);
}

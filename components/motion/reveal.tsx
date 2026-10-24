"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { REVEAL_TRAVEL, REVEAL_VIEWPORT_MARGIN } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useViewReveal, type ViewRevealState } from "./use-view-reveal";

interface RevealProps {
	children: ReactNode;
	delayMs?: number;
	className?: string;
	as?: "div" | "section" | "article" | "li" | "h1" | "h2" | "h3" | "p" | "header" | "aside";
	eager?: boolean;
	direction?: "up" | "down" | "left" | "right";
	distance?: number;
	/** item = shorter list entrance; plate = clip-path unveil without image resampling. */
	variant?: "up" | "item" | "plate";
	/** Slower single-plate unveil (700ms, --ease-emphatic) on the eager plate path. */
	unveil?: boolean;
}

type RevealBoxProps = Omit<RevealProps, "eager"> & {
	/** Present on the in-view path only: the useViewReveal ref and state. */
	view?: { ref: RefObject<HTMLElement | null>; state: ViewRevealState };
};

const DIR = { up: "Y", down: "Y", left: "X", right: "X" } as const;
const SIGN = { up: 1, down: -1, left: -1, right: 1 } as const;

/**
 * Both paths are CSS entrances (app/animations.css), so the server HTML plays
 * them on first paint before hydration and ends visible even if JavaScript
 * never runs. Eager reveals stop there. In-view reveals also take a
 * useViewReveal ref: once hydrated, a host still below the fold is re-armed
 * into its from-state (data-motion-reveal="armed") and replays the entrance
 * when it scrolls in; a host already on screen keeps its first-paint entrance.
 */
export function Reveal({ eager = false, ...rest }: Readonly<RevealProps>) {
	return eager ? <RevealBox {...rest} /> : <InViewReveal {...rest} />;
}

function InViewReveal(props: Readonly<Omit<RevealProps, "eager">>) {
	const [ref, state] = useViewReveal<HTMLElement>(REVEAL_VIEWPORT_MARGIN);
	return <RevealBox {...props} view={{ ref, state }} />;
}

function RevealBox({
	children,
	delayMs = 0,
	className,
	as: Tag = "div",
	direction = "up",
	distance,
	variant = "up",
	unveil = false,
	view,
}: Readonly<RevealBoxProps>) {
	const plate = variant === "plate";
	const axis = DIR[direction];
	const travel = distance ?? (variant === "item" ? REVEAL_TRAVEL.item : REVEAL_TRAVEL.block);
	const offset = SIGN[direction] * travel;
	// Eager plates honour the unveil modifier; in-view plates keep the 700ms
	// --ease-out wipe and in-view fades end with no transform left behind.
	const eagerClass = plate ? cn("reveal-plate", unveil && "reveal-plate-unveil") : "reveal-up";
	const viewClass = plate ? "reveal-view-plate" : "reveal-view";

	return (
		<Tag
			// A callback ref typed on HTMLElement fits every tag in the `as` union.
			ref={
				view
					? (node: HTMLElement | null) => {
							view.ref.current = node;
						}
					: undefined
			}
			data-motion-reveal={view?.state}
			className={cn(view ? viewClass : eagerClass, className)}
			style={
				{
					animationDelay: `${delayMs}ms`,
					"--reveal-offset-x": axis === "X" ? `${offset}px` : "0px",
					"--reveal-offset-y": axis === "Y" ? `${offset}px` : "0px",
				} as CSSProperties
			}
		>
			{children}
		</Tag>
	);
}

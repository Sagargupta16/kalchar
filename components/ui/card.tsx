import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
	children: ReactNode;
	className?: string;
	hover?: boolean;
	padding?: "sm" | "md" | "lg";
}

const PADDING_MAP = {
	sm: "p-4",
	md: "p-5 sm:p-6",
	lg: "p-6 sm:p-8",
};

export function Card({ children, className, hover = false, padding = "md" }: Readonly<CardProps>) {
	return (
		<div
			className={cn(
				// Resting: hairline edge + e1 lift (one elevation decision). Hover
				// rises to e2 with a subtle translate. Transition is scoped to the
				// props that change (not `all`) at the micro duration for tactility.
				"rounded-(--radius-md) border border-line bg-bg shadow-e1",
				PADDING_MAP[padding],
				hover &&
					"transition-[transform,box-shadow,border-color] duration-(--duration-micro) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-e2",
				className,
			)}
		>
			{children}
		</div>
	);
}

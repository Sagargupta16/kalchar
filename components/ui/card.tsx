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
				"rounded-(--radius-md) border border-line bg-bg",
				PADDING_MAP[padding],
				hover &&
					"transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-lg",
				className,
			)}
		>
			{children}
		</div>
	);
}

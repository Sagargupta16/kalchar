import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconCircleProps {
	children: ReactNode;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const SIZE_MAP = {
	sm: "h-9 w-9",
	md: "h-11 w-11",
	lg: "h-14 w-14",
};

export function IconCircle({ children, size = "md", className }: Readonly<IconCircleProps>) {
	return (
		<span
			className={cn(
				"grid shrink-0 place-items-center rounded-full bg-bg-soft text-(--section-accent) ring-1 ring-line transition-colors duration-(--duration-base) ease-(--ease-out)",
				SIZE_MAP[size],
				className,
			)}
			aria-hidden="true"
		>
			{children}
		</span>
	);
}

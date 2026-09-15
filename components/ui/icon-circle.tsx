import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconCircleProps {
	children: ReactNode;
	size?: "xs" | "sm" | "md" | "lg";
	className?: string;
}

const SIZE_MAP: Record<NonNullable<IconCircleProps["size"]>, string> = {
	xs: "size-8",
	sm: "size-9",
	md: "size-control",
	lg: "size-14",
};

export function IconCircle({ children, size = "md", className }: Readonly<IconCircleProps>) {
	return (
		<span
			className={cn(
				"grid shrink-0 place-items-center rounded-full bg-canvas text-(--section-accent) ring-1 ring-line transition-ui",
				SIZE_MAP[size],
				className,
			)}
			aria-hidden="true"
		>
			{children}
		</span>
	);
}

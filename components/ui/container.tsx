import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
	children: ReactNode;
	className?: string;
	size?: "default" | "narrow" | "wide";
}

const SIZE_MAP = {
	default: "max-w-6xl",
	narrow: "max-w-3xl",
	wide: "max-w-7xl",
};

export function Container({ children, className, size = "default" }: Readonly<ContainerProps>) {
	return (
		<div className={cn("mx-auto px-(--container-px)", SIZE_MAP[size], className)}>{children}</div>
	);
}

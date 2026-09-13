import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ContainerSize = "default" | "narrow" | "wide";

interface ContainerProps {
	children: ReactNode;
	className?: string;
	size?: ContainerSize;
	/** Semantic wrapper so callers stop hand-rolling mx-auto max-w-6xl px-(--container-px). */
	as?: "div" | "section" | "main" | "header" | "nav" | "footer";
}

const SIZE_MAP: Record<ContainerSize, string> = {
	default: "max-w-(--content-max)",
	narrow: "max-w-(--prose-max)",
	wide: "max-w-7xl",
};

export function Container({
	children,
	className,
	size = "default",
	as: Tag = "div",
}: Readonly<ContainerProps>) {
	return (
		<Tag className={cn("mx-auto px-(--container-px)", SIZE_MAP[size], className)}>{children}</Tag>
	);
}

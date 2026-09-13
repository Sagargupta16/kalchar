import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Resting surface: hairline edge + e1 lift on --color-surface (lighter than the
 * canvas in BOTH modes). `interactive` adds the 150ms lift to e2 with the
 * section pigment on the edge; consumers that need <a> / <figure> / <article>
 * semantics compose `cardVariants` directly.
 */
export const cardVariants = cva("rounded-(--radius-md) border border-line bg-surface shadow-e1", {
	variants: {
		padding: { none: "", sm: "p-4", md: "p-(--card-pad)", lg: "p-(--card-pad-lg)" },
		interactive: {
			true: "transition-ui pressable hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-e2",
			false: "",
		},
	},
	defaultVariants: { padding: "md", interactive: false },
});

interface CardProps extends VariantProps<typeof cardVariants> {
	children: ReactNode;
	className?: string;
	/** @deprecated alias of `interactive`; integration deletes it once no call site uses it. */
	hover?: boolean;
}

export function Card({ children, className, padding, interactive, hover }: Readonly<CardProps>) {
	return (
		<div
			className={cn(
				cardVariants({ padding, interactive: interactive ?? hover ?? false }),
				className,
			)}
		>
			{children}
		</div>
	);
}

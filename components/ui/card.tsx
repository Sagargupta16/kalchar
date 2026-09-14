import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Resting surface: hairline edge + e1 lift on --color-surface (lighter than the
 * canvas in BOTH modes). `interactive` adds the 150ms lift with the elevate-e2
 * ::after crossfade (the shadow never tweens box-shadow), the section pigment
 * on the edge and, in dark, a one-step surface rise (motion addendum C1);
 * consumers that need <a> / <figure> / <article> semantics compose
 * `cardVariants` directly.
 */
export const cardVariants = cva("rounded-(--radius-md) border border-line bg-surface shadow-e1", {
	variants: {
		padding: { none: "", sm: "p-4", md: "p-(--card-pad)", lg: "p-(--card-pad-lg)" },
		interactive: {
			true: "transition-ui pressable elevate-e2 hover:-translate-y-0.5 hover:border-(--section-accent) dark:hover:bg-surface-raised",
			false: "",
		},
	},
	defaultVariants: { padding: "md", interactive: false },
});

interface CardProps extends VariantProps<typeof cardVariants> {
	children: ReactNode;
	className?: string;
}

export function Card({ children, className, padding, interactive }: Readonly<CardProps>) {
	return <div className={cn(cardVariants({ padding, interactive }), className)}>{children}</div>;
}

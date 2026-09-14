import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-ui pressable disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary:
					"rounded-(--radius-sm) bg-accent text-bg shadow-e1 hover:bg-accent-hover hover:-translate-y-px hover:shadow-e2",
				secondary:
					"rounded-(--radius-sm) border border-line bg-canvas text-ink hover:border-accent hover:text-accent-text",
				ghost:
					"rounded-(--radius-sm) border border-line bg-transparent text-ink hover:border-accent hover:bg-canvas hover:text-accent-text",
				outline:
					"rounded-(--radius-sm) border border-accent bg-transparent text-accent-text hover:bg-accent hover:text-bg",
				link: "relative h-auto bg-transparent p-0 text-accent-text underline decoration-accent/40 underline-offset-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current motion-safe:after:transition-transform hover:after:scale-x-100 focus-visible:after:scale-x-100",
			},
			size: {
				sm: "min-h-9 px-3.5 py-1.5 text-xs uppercase tracking-eyebrow pointer-coarse:min-h-control",
				md: "min-h-control px-5 py-2 text-sm uppercase tracking-meta",
				lg: "min-h-12 px-7 py-3 text-sm uppercase tracking-meta",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, ...props }, ref) => (
		<button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
	),
);
Button.displayName = "Button";

export type { ButtonProps };
export { Button, buttonVariants };

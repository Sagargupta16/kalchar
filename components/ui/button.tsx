import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-(--duration-base) ease-(--ease-out) active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary:
					"rounded-(--radius-sm) bg-accent text-bg shadow-sm hover:bg-accent-hover hover:-translate-y-px hover:shadow-md",
				secondary:
					"rounded-(--radius-sm) bg-bg-soft text-ink border border-line hover:border-accent hover:text-accent",
				ghost:
					"rounded-(--radius-sm) border border-line bg-transparent text-ink hover:border-accent hover:bg-bg-soft hover:text-accent",
				outline:
					"rounded-(--radius-sm) bg-transparent text-accent border border-accent hover:bg-accent hover:text-bg",
				link: "bg-transparent text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent p-0 h-auto",
			},
			size: {
				sm: "h-9 px-3.5 text-xs uppercase tracking-[var(--tracking-eyebrow)]",
				md: "h-11 px-5 text-sm uppercase tracking-[var(--tracking-meta)]",
				lg: "h-12 px-7 text-sm uppercase tracking-[var(--tracking-meta)]",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
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

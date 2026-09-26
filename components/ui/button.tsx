import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tactile buttons. Hover lifts on a springy curve (a small overshoot, so the
 * control feels physical rather than tweened), press sinks through the
 * pressable scale, and any trailing arrow icon nudges forward on hover. The
 * primary also carries a one-pass light sweep (a pseudo element travelling on
 * transform only). Sizes stay on the 44px floor (md) and 48px (lg).
 */
const SPRINGY =
	"transition-[color,background-color,border-color,box-shadow,transform,translate,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

const buttonVariants = cva(
	cn(
		"relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium pressable disabled:pointer-events-none disabled:opacity-50",
		SPRINGY,
		// Trailing icons ride forward on hover (arrows read as "go").
		"[&>svg:last-child:not(:first-child)]:transition-transform [&>svg:last-child:not(:first-child)]:duration-300 hover:[&>svg:last-child:not(:first-child)]:translate-x-0.5",
	),
	{
		variants: {
			variant: {
				primary: cn(
					"overflow-hidden rounded-(--radius-sm) bg-accent text-bg shadow-e1 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-e3",
					"before:pointer-events-none before:absolute before:inset-y-0 before:-left-1/2 before:-z-10 before:w-1/2 before:-skew-x-12 before:bg-linear-to-r before:from-transparent before:via-bg/30 before:to-transparent before:transition-transform before:duration-700 before:ease-out hover:before:translate-x-[320%]",
				),
				secondary:
					"rounded-(--radius-sm) border border-line bg-canvas text-ink hover:-translate-y-0.5 hover:border-accent hover:bg-surface hover:text-accent-text hover:shadow-e2",
				ghost:
					"rounded-(--radius-sm) border border-line bg-transparent text-ink hover:-translate-y-0.5 hover:border-accent hover:bg-canvas hover:text-accent-text",
				outline:
					"rounded-(--radius-sm) border border-accent bg-transparent text-accent-text hover:-translate-y-0.5 hover:bg-accent hover:text-bg",
				link: "h-auto bg-transparent p-0 text-accent-text underline decoration-accent/40 underline-offset-4 hover:decoration-current focus-visible:decoration-current",
			},
			size: {
				sm: "min-h-control px-4 py-2 text-sm",
				md: "min-h-control px-5 py-2 text-sm",
				lg: "min-h-12 px-6 py-3 text-base",
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

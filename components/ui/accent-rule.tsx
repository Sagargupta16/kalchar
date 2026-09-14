import { cn } from "@/lib/utils";

/**
 * Short decorative rule, used beside eyebrow labels and under titles. Always
 * aria-hidden -- it's pure ornament. `variant="gold"` renders the museum
 * hairline (--color-gold-hairline); the default stays the section pigment.
 * The rule draws in via .rule-draw (transform-origin per `origin`; pull
 * quotes draw from the centre) unless `static` skips the animation; reduced
 * motion always renders it drawn (animations.css).
 */

interface AccentRuleProps {
	variant?: "accent" | "gold";
	/** Draw origin: left (default) or center (pull quotes). */
	origin?: "left" | "center";
	/** Skip the draw animation entirely. */
	static?: boolean;
	className?: string;
}

export function AccentRule({
	variant = "accent",
	origin = "left",
	static: isStatic = false,
	className,
}: Readonly<AccentRuleProps>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"inline-block h-px w-5",
				variant === "gold" ? "bg-(--color-gold-hairline)" : "bg-(--section-accent)",
				!isStatic && "rule-draw",
				!isStatic && origin === "center" && "rule-draw-center",
				className,
			)}
		/>
	);
}

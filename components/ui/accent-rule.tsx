import { cn } from "@/lib/utils";

/**
 * Short decorative rule in the active section's accent color, used beside
 * eyebrow labels. Always aria-hidden -- it's pure ornament.
 */
export function AccentRule({ className }: Readonly<{ className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn("inline-block h-px w-5 bg-(--section-accent)", className)}
		/>
	);
}

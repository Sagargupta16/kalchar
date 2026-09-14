import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpreadProps {
	/** The section's header block (caller owns its Reveal). */
	header: ReactNode;
	className?: string;
	children: ReactNode;
}

/**
 * Catalogue spread for the home section shells (visual-direction 2.1): below
 * the hero every shell reads like a printed spread at lg, the header in a
 * sticky left rail (4 of 12 columns, offset under the shrunk chrome bar) and
 * the content filling the right 8. On phones it stays the stacked
 * header-then-content flow on the one --space-block seam.
 */
export function Spread({ header, className, children }: Readonly<SpreadProps>) {
	return (
		<div className={cn("lg:grid lg:grid-cols-12 lg:gap-x-12", className)}>
			<div className="lg:sticky lg:col-span-4 lg:top-[calc(var(--header-h-shrunk)+var(--space-page))] lg:self-start">
				{header}
			</div>
			<div className="mt-(--space-block) lg:col-span-8 lg:mt-0">{children}</div>
		</div>
	);
}

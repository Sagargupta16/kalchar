import { cn } from "@/lib/utils";

/**
 * Kachni rule -- the Madhubani double-line divider (visual-direction 1.6 item
 * 1). Two 1px lines; the long form is 5px apart with a 2px pigment dot every
 * 12px between them (7px total, centred at the header measure: THE home-page
 * section divider), the short form is 64px wide with the lines 1px apart and
 * no dots (3px total: underlines a page-header eyebrow). Lines mix the section
 * pigment into the hairline; dots are the pigment at 45%. Static always (page
 * furniture, not a motion moment); pure ornament (aria-hidden). Never on
 * /work grid pages and never under /admin.
 */

const LINE_COLOR = "color-mix(in oklch, var(--section-accent) 35%, var(--color-line))";
/** 2px dot (1px radius) centred in each 12x7 tile, so it sits between the lines. */
const DOTS = "radial-gradient(circle, currentColor 1px, transparent 1px)";

interface KachniRuleProps {
	form?: "long" | "short";
	className?: string;
}

export function KachniRule({ form = "long", className }: Readonly<KachniRuleProps>) {
	if (form === "short") {
		return (
			<div
				aria-hidden="true"
				role="presentation"
				style={{ borderColor: LINE_COLOR }}
				className={cn("h-[3px] w-16 border-y", className)}
			/>
		);
	}
	return (
		<div
			aria-hidden="true"
			role="presentation"
			style={{
				borderColor: LINE_COLOR,
				backgroundImage: DOTS,
				backgroundSize: "12px 7px",
			}}
			className={cn(
				"mx-auto h-[7px] w-full max-w-(--header-max) border-y text-(--section-accent)/45",
				className,
			)}
		/>
	);
}

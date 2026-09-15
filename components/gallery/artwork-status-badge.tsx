import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ArtworkStatusBadgeProps {
	isAvailable: boolean;
	isSold: boolean;
	/** Grid cards pin the pill to the frame's bottom-left so the plate's top
	 *  edge stays clean (visual-direction 2.2); lightbox figure and detail
	 *  plate keep the top-left corner. */
	placement?: "top-left" | "bottom-left";
}

const PLACEMENT = {
	"top-left": "left-3 top-3",
	"bottom-left": "bottom-2 left-2",
} as const;

/** One status chip for card, lightbox figure and detail plate. Sold wins over
 *  Available; archive renders nothing (its state is spoken in the caption).
 *  Server-safe: no hooks. */
export function ArtworkStatusBadge({
	isAvailable,
	isSold,
	placement = "top-left",
}: Readonly<ArtworkStatusBadgeProps>) {
	if (isSold) {
		return (
			<Badge
				variant="sold"
				className={cn("pointer-events-none absolute z-raised shadow-e1", PLACEMENT[placement])}
			>
				Sold
			</Badge>
		);
	}
	if (isAvailable) {
		return (
			<Badge
				variant="overlay"
				className={cn("pointer-events-none absolute z-raised", PLACEMENT[placement])}
			>
				<Check size={11} aria-hidden="true" className="text-(--section-accent)" />
				Available
			</Badge>
		);
	}
	return null;
}

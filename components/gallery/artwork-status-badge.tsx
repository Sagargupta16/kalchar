import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ArtworkStatusBadgeProps {
	isAvailable: boolean;
	isSold: boolean;
}

/** One status chip for card, lightbox figure and detail plate: a rounded pill at
 *  12px from the plate's top-left. Sold wins over Available; archive renders nothing
 *  (its state is spoken in the caption). Server-safe: no hooks. */
export function ArtworkStatusBadge({ isAvailable, isSold }: Readonly<ArtworkStatusBadgeProps>) {
	if (isSold) {
		return (
			<Badge
				variant="sold"
				className="pointer-events-none absolute left-3 top-3 z-raised shadow-e1"
			>
				Sold
			</Badge>
		);
	}
	if (isAvailable) {
		return (
			<Badge variant="overlay" className="pointer-events-none absolute left-3 top-3 z-raised">
				<Check size={11} aria-hidden="true" className="text-(--section-accent)" />
				Available
			</Badge>
		);
	}
	return null;
}

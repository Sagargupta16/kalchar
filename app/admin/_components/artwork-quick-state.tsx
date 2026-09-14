"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";
import {
	ARTWORK_STATUS_OPTIONS,
	artworkStatusLabel,
	quickStateBlockedReason,
} from "@/lib/artwork-status";
import { SPRING_INDICATOR } from "@/lib/motion";
import type { ArtworkStatus } from "@/lib/types";
import { adminIconBtn, ICON_MD } from "./controls";
import type { SegmentedOption } from "./segmented";

// StatusChip and QuickStateSheet are retired (visual-direction-admin Tier 1b,
// D-A12): the inline Segmented control on rows and in the edit sheet replaces
// both, one less tap and no dialog.

/** Status dot colour per stored state, on the 1.15 status tokens (terracotta is never a status). */
export const DOT: Record<ArtworkStatus, string> = {
	available: "bg-status-available",
	sold: "bg-status-sold",
	archive: "bg-status-nfs",
};

/**
 * The three Segmented options for a piece's status (1.8). The archive option's
 * price guard maps to a disabled segment whose reason renders as the helper
 * line under the control; the "available without a price" reason stays
 * advisory and never disables.
 */
export function useArtworkStatusOptions(
	priceInr: number | null | undefined,
): readonly SegmentedOption<ArtworkStatus>[] {
	return ARTWORK_STATUS_OPTIONS.map((status) => {
		const blocked = status === "archive" ? quickStateBlockedReason("archive", priceInr) : null;
		return {
			value: status,
			label: artworkStatusLabel(status),
			dotClass: DOT[status],
			disabled: blocked !== null,
			disabledReason: blocked ?? undefined,
		};
	});
}

/** Helper line under the segmented track: NFS names its public effect (D31). */
export function artworkStatusHelper(status: ArtworkStatus): string | undefined {
	return status === "archive" ? "Shown in the gallery without a price" : undefined;
}

interface FeaturedToggleProps {
	title: string;
	featured: boolean;
	disabled: boolean;
	onChange: (featured: boolean) => void;
}

/**
 * The row star (1.9): gold-leaf fill when on, a sub-300ms scale pop on the
 * flip (Motion animate keyed on the pressed state, SPRING_INDICATOR; press-in
 * comes from pressable). The label stays the verb phrase in both states (the
 * state is aria-pressed); reduced motion snaps via MotionConfig.
 */
export function FeaturedToggle({
	title,
	featured,
	disabled,
	onChange,
}: Readonly<FeaturedToggleProps>) {
	return (
		<button
			type="button"
			disabled={disabled}
			aria-pressed={featured}
			aria-label={`Feature ${title}`}
			title={featured ? "Featured on the home page" : "Feature on the home page"}
			onClick={() => onChange(!featured)}
			className={adminIconBtn}
		>
			<motion.span
				aria-hidden="true"
				className="grid"
				initial={false}
				animate={featured ? { scale: [1, 1.15, 1] } : { scale: 1 }}
				transition={SPRING_INDICATOR}
			>
				<Star size={ICON_MD} className={featured ? "fill-current text-gold-leaf" : undefined} />
			</motion.span>
		</button>
	);
}

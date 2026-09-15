import { cn } from "@/lib/utils";

/**
 * Chromacard -- a row of pigment dots sampled from the artwork.
 *
 * Reads like a museum palette caption: small uniform dots in the piece's
 * actual pigments (visual-direction 2.2: size-2.5 dots on a gap-1 row).
 * Powered by the optional `palette` array on Artwork (3-5 hex strings).
 * When absent or empty, renders nothing so cards without a palette stay clean.
 *
 * Hex values are the lone exception to the "no raw colors in components"
 * rule -- they ARE the data being shown. They're not theme colors.
 */
interface ChromacardProps {
	palette?: readonly string[];
	/** Accessible label used by screen readers. */
	ariaLabel: string;
	/** Optional className passed through to the root strip. */
	className?: string;
	/**
	 * When true, the dot row blooms (scale-y 1.25, a compositor-only transform)
	 * whenever an ancestor with the Tailwind `group` class is hovered. Used by
	 * the gallery card to choreograph a subtle bloom alongside the plate lift;
	 * the artwork detail page leaves it off so the static palette caption
	 * doesn't move.
	 */
	groupHoverBloom?: boolean;
}

export function Chromacard({
	palette,
	ariaLabel,
	className,
	groupHoverBloom = false,
}: Readonly<ChromacardProps>) {
	if (!palette || palette.length === 0) return null;
	return (
		<div
			role="img"
			aria-label={ariaLabel}
			className={cn(
				"flex items-center gap-1",
				groupHoverBloom && "origin-center transition-transform group-hover:scale-y-125",
				className,
			)}
		>
			{palette.map((hex, i) => (
				<span
					// the palette is part of the artwork's identity, so duplicates are
					// allowed and stable in order -- index keys are appropriate here.
					// biome-ignore lint/suspicious/noArrayIndexKey: stable position-based palette
					key={`${hex}-${i}`}
					className="block size-2.5 rounded-full ring-1 ring-line/50"
					style={{ backgroundColor: hex }}
				/>
			))}
		</div>
	);
}

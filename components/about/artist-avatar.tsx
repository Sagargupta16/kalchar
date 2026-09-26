import { useId } from "react";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { cn } from "@/lib/utils";
import "@/components/editorial/editorial.css";

/**
 * Artist profile image with a graceful fallback.
 *
 * When a profile image key is set (in the `settings` table, read server-side),
 * it renders the responsive R2 <picture>. With no key, it falls back to a
 * monogram medallion: the brand devanagari mark on a pigment glow inside a
 * slowly turning ring of wall text, so the slot reads as a designed plate,
 * never an empty or broken one. The fallback is decided on the server, so
 * there's no flash.
 */
interface ArtistAvatarProps {
	/** R2 key-base for the profile image, or undefined for the monogram fallback. */
	imageKey?: string;
	/** Devanagari brand mark (e.g. "म") shown in the fallback. */
	monogram: string;
	alt: string;
	className?: string;
	/** sizes hint for the responsive image. */
	sizes?: string;
	priority?: boolean;
	/** Words set around the fallback's ring. */
	ringText?: string;
}

const DEFAULT_RING = "Kalchar by Megha · Folk art · Kalchar by Megha · Folk art · ";

export function ArtistAvatar({
	imageKey,
	monogram,
	alt,
	className,
	sizes = "(min-width: 768px) 33vw, 100vw",
	priority = false,
	ringText = DEFAULT_RING,
}: Readonly<ArtistAvatarProps>) {
	const ringId = useId();
	return (
		<div
			className={cn(
				"relative aspect-4/5 overflow-hidden rounded-(--radius-md) bg-canvas shadow-hairline",
				className,
			)}
		>
			{imageKey ? (
				<ResponsiveImage
					keyBase={imageKey}
					alt={alt}
					sizes={sizes}
					priority={priority}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : (
				<div
					aria-label={alt}
					role="img"
					className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--section-accent)_28%,transparent),transparent_70%)]"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 200 200"
						className="ring-spin absolute w-[86%] max-w-80 text-(--section-accent)"
					>
						<defs>
							<path id={ringId} d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
						</defs>
						<circle
							cx="100"
							cy="100"
							r="68"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.35"
							strokeWidth="0.75"
						/>
						<text className="fill-current text-[10.5px] font-medium tracking-[0.32em] uppercase">
							<textPath href={`#${ringId}`}>{ringText}</textPath>
						</text>
					</svg>
					<span
						lang="hi"
						aria-hidden="true"
						className="font-devanagari select-none text-8xl text-(--section-accent) sm:text-9xl"
					>
						{monogram}
					</span>
				</div>
			)}
		</div>
	);
}

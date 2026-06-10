import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { cn } from "@/lib/utils";

/**
 * Artist profile image with a graceful fallback.
 *
 * When a profile image key is set (in the `settings` table, read server-side),
 * it renders the responsive R2 <picture>. With no key, it falls back to a clean
 * monogram plate (the brand devanagari mark) so the slot never looks broken or
 * empty. The fallback is decided on the server, so there's no flash.
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
}

export function ArtistAvatar({
	imageKey,
	monogram,
	alt,
	className,
	sizes = "(min-width: 768px) 33vw, 100vw",
	priority = false,
}: Readonly<ArtistAvatarProps>) {
	return (
		<div
			className={cn(
				"relative aspect-4/5 overflow-hidden rounded-(--radius-md) bg-bg-soft ring-1 ring-black/8 dark:ring-white/8",
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
					className="absolute inset-0 grid place-items-center bg-gradient-to-br from-(--section-accent)/12 to-bg-soft"
				>
					<span
						lang="hi"
						aria-hidden="true"
						className="font-devanagari select-none text-7xl text-(--section-accent) opacity-70 sm:text-8xl"
					>
						{monogram}
					</span>
				</div>
			)}
		</div>
	);
}

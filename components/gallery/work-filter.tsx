"use client";

import { useMemo, useState } from "react";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { Reveal } from "@/components/motion/reveal";
import type { ArtStyle, Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Style filter + responsive gallery grid.
 *
 * Server passes the full sorted catalog as props; the Client island handles
 * the filter pill state and renders the visible subset. Filtering is local
 * (no re-fetch) so toggling between styles is instant.
 *
 * Cards are uniform 3:4 plates -- the user picked uniform-cropped over
 * masonry to avoid the previous attempt's size inconsistency.
 */
type GalleryItem = Pick<
	Artwork,
	| "slug"
	| "title"
	| "style"
	| "medium"
	| "image"
	| "description"
	| "featured"
	| "order"
	| "aspectRatio"
	| "priceInr"
	| "status"
	| "palette"
>;

interface WorkFilterProps {
	styles: readonly ArtStyle[];
	items: readonly GalleryItem[];
}

const ALL = "All" as const;

export function WorkFilter({ styles, items }: Readonly<WorkFilterProps>) {
	const [active, setActive] = useState<typeof ALL | ArtStyle>(ALL);

	const visible = useMemo(
		() => (active === ALL ? items : items.filter((i) => i.style === active)),
		[active, items],
	);

	const filters: (typeof ALL | ArtStyle)[] = [ALL, ...styles];

	const pieceWord = visible.length === 1 ? "piece" : "pieces";
	const statusMessage =
		active === ALL
			? `Showing all ${visible.length} pieces`
			: `Showing ${visible.length} ${active} ${pieceWord}`;

	return (
		<>
			<h2 className="sr-only">Gallery</h2>
			<fieldset className="flex flex-wrap gap-2 border-0 p-0 m-0 min-w-0">
				<legend className="sr-only">Filter by style</legend>
				{filters.map((f) => {
					const isActive = f === active;
					return (
						<button
							key={f}
							type="button"
							onClick={() => setActive(f)}
							aria-pressed={isActive}
							className={cn(
								"min-h-10 rounded-full border px-4 py-2 text-xs uppercase tracking-meta transition-colors",
								isActive
									? "border-ink bg-ink text-bg"
									: "border-line text-muted hover:border-accent hover:text-accent",
							)}
						>
							{f}
						</button>
					);
				})}
			</fieldset>

			<p className="sr-only" aria-live="polite">
				{statusMessage}
			</p>

			{visible.length > 0 ? (
				<ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:gap-y-14 lg:grid-cols-3">
					{visible.map((art, i) => (
						<Reveal key={art.slug} as="li" delayMs={Math.min(i, 5) * 60}>
							<ArtworkCard
								artwork={art as Artwork}
								siblings={visible as Artwork[]}
								priority={i < 3}
							/>
						</Reveal>
					))}
				</ul>
			) : (
				<p className="mt-12 text-sm text-muted">No pieces in this style yet.</p>
			)}
		</>
	);
}

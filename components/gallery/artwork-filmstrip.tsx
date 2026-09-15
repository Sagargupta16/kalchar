"use client";

import { useEffect, useRef } from "react";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArtImage } from "./art-image";

interface ArtworkFilmstripProps {
	artworks: readonly Artwork[];
	activeSlug: string;
	hidden: boolean;
	onSelect: (artwork: Artwork, direction?: 1 | -1) => void;
}

/** Roving focus keeps a long catalogue to one Tab stop. Selection uses the same
 * context callback as arrows and swipes, including the existing URL/history sync. */
export function ArtworkFilmstrip({
	artworks,
	activeSlug,
	hidden,
	onSelect,
}: Readonly<ArtworkFilmstripProps>) {
	const railRef = useRef<HTMLUListElement>(null);
	const keyboardSelection = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: selection changes reveal the current thumbnail
	useEffect(() => {
		const rail = railRef.current;
		const selected = rail?.querySelector<HTMLButtonElement>('[aria-current="true"]');
		if (!rail || !selected) return;
		const railBox = rail.getBoundingClientRect();
		const selectedBox = selected.getBoundingClientRect();
		rail.scrollTo({
			left:
				rail.scrollLeft + selectedBox.left - railBox.left - (railBox.width - selectedBox.width) / 2,
			behavior: "smooth",
		});
		if (keyboardSelection.current) {
			selected.focus({ preventScroll: true });
			keyboardSelection.current = false;
		}
	}, [activeSlug]);

	if (artworks.length < 2) return null;

	return (
		<nav
			aria-label="Artwork thumbnails"
			inert={hidden || undefined}
			className={cn(
				"mx-auto w-full max-w-2xl shrink-0 transition-ui",
				hidden && "pointer-events-none opacity-0",
			)}
		>
			<ul
				ref={railRef}
				className="flex gap-2 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{artworks.map((artwork, index) => {
					const selected = artwork.slug === activeSlug;
					return (
						<li key={artwork.slug} className="shrink-0 first:ml-auto last:mr-auto">
							<button
								type="button"
								aria-label={`View ${artwork.title}`}
								aria-current={selected ? "true" : undefined}
								tabIndex={selected ? 0 : -1}
								title={artwork.title}
								onClick={() => onSelect(artwork)}
								onKeyDown={(event) => {
									let target: number;
									let direction: 1 | -1 | undefined;
									if (event.key === "Home") target = 0;
									else if (event.key === "End") target = artworks.length - 1;
									else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
										direction = event.key === "ArrowRight" ? 1 : -1;
										const next = index + direction;
										target =
											artworks.length >= 3
												? (next + artworks.length) % artworks.length
												: Math.max(0, Math.min(artworks.length - 1, next));
									} else return;
									event.preventDefault();
									const nextArtwork = artworks[target];
									if (!nextArtwork || nextArtwork.slug === activeSlug) return;
									keyboardSelection.current = true;
									onSelect(nextArtwork, direction);
								}}
								className={cn(
									"relative block h-14 w-12 overflow-hidden rounded-md border-2 p-1 transition-ui pressable",
									selected
										? "border-bg bg-bg/15 dark:border-ink dark:bg-ink/15"
										: "border-transparent bg-bg/5 hover:border-bg/50 dark:bg-ink/5 dark:hover:border-ink/50",
								)}
							>
								<ArtImage
									src={`/artworks/${artwork.image}`}
									alt=""
									sizes="40px"
									maxWidth={400}
									className="h-full w-full rounded-md object-contain"
								/>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { LightboxIconButton, ViewerDialog } from "@/components/gallery/viewer-dialog";
import { DUR, EASE_IN, EASE_OUT, SPRING_PANEL } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Inline photo grid for one event, with an image-only lightbox.
 *
 * Instagram-profile style: a uniform square grid (2 cols on phones, 3 from sm
 * up). Each tile shows the WHOLE image (object-contain on a soft ground), never
 * cropped -- this is an art portfolio, so the artist's framing is preserved;
 * only the displayed size changes, not the aspect. Up to MAX_INLINE tiles show;
 * a "+N more" overlay on the last opens the lightbox at that point. The lightbox
 * cycles through ALL photos (arrows + keyboard + swipe), arrows shown whenever
 * there's more than one. Tiles sit on --radius-md (grid plate); only the
 * lightbox figure uses --radius-lg (D13). The panel grows from the tapped tile
 * (transform-origin), never from the viewport centre.
 */
const MAX_INLINE = 6;
/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 50;
/** Sibling slide distance (px) when paging inside the lightbox. */
const SLIDE_PX = 24;

interface EventGalleryProps {
	images: string[];
	title: string;
}

export function EventGallery({ images, title }: Readonly<EventGalleryProps>) {
	const [lightboxAt, setLightboxAt] = useState<number | null>(null);
	const [origin, setOrigin] = useState<string | undefined>(undefined);

	if (images.length === 0) return null;

	const inline = images.slice(0, MAX_INLINE);
	// The overflow tile sits on the last inline slot and covers its own photo, so
	// that photo counts toward "+N" too: N = total - the (MAX_INLINE - 1) tiles
	// that stay individually viewable. Only overflow once we actually exceed the
	// grid, so an exact-fit set (length === MAX_INLINE) shows every tile clean.
	const overflow = images.length > MAX_INLINE ? images.length - (MAX_INLINE - 1) : 0;
	// A single photo gets a roomier slot; multiples tile as a uniform square grid.
	const gridClass = images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3";
	const tileAspect = images.length === 1 ? "aspect-4/3" : "aspect-square";
	const tileSizes =
		images.length === 1
			? "(min-width: 1152px) 1030px, calc(100vw - 96px)"
			: "(min-width: 1152px) 335px, (min-width: 640px) 30vw, calc((100vw - 90px) / 2)";

	const open = (index: number, tile: HTMLElement) => {
		// The tile's centre as viewport percentages: the panel scales from here.
		const rect = tile.getBoundingClientRect();
		const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
		const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
		setOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
		setLightboxAt(index);
	};

	return (
		<>
			<ul className={cn("grid gap-2 sm:gap-3", gridClass)}>
				{inline.map((keyBase, i) => {
					const showOverflow = overflow > 0 && i === MAX_INLINE - 1;
					return (
						<li key={keyBase}>
							<PhotoTile
								keyBase={keyBase}
								title={title}
								index={i}
								aspect={tileAspect}
								sizes={tileSizes}
								priority={i === 0}
								overflow={showOverflow ? overflow : undefined}
								totalForLabel={showOverflow ? images.length : undefined}
								onOpen={(tile) => open(i, tile)}
							/>
						</li>
					);
				})}
			</ul>

			<EventLightbox
				images={images}
				title={title}
				index={lightboxAt}
				origin={origin}
				onClose={() => setLightboxAt(null)}
				onIndex={setLightboxAt}
			/>
		</>
	);
}

interface PhotoTileProps {
	keyBase: string;
	title: string;
	index: number;
	aspect: string;
	sizes: string;
	priority?: boolean;
	/** When set, render a "+N" overlay (the overflow entry). */
	overflow?: number;
	/** Total photo count, for the overflow tile's aria-label. */
	totalForLabel?: number;
	onOpen: (tile: HTMLElement) => void;
}

function PhotoTile({
	keyBase,
	title,
	index,
	aspect,
	sizes,
	priority = false,
	overflow,
	totalForLabel,
	onOpen,
}: Readonly<PhotoTileProps>) {
	return (
		<button
			type="button"
			onClick={(e) => onOpen(e.currentTarget)}
			aria-label={
				overflow !== undefined && totalForLabel !== undefined
					? `View all ${totalForLabel} photos from ${title}`
					: `View photo ${index + 1} from ${title}`
			}
			className={cn(
				"group relative block w-full overflow-hidden rounded-(--radius-md) bg-canvas shadow-hairline transition-ui pressable hover:-translate-y-0.5 hover:shadow-e2-edged hover:ring-1 hover:ring-(--section-accent)",
				aspect,
			)}
		>
			{/* The frame lifts on hover; the photo itself never scales (no resampled brushwork). */}
			<ResponsiveImage
				keyBase={keyBase}
				alt={`${title}, photo ${index + 1}`}
				sizes={sizes}
				priority={priority}
				className="absolute inset-0 h-full w-full object-contain"
			/>
			{overflow === undefined ? null : (
				<span className="absolute inset-0 grid place-items-center bg-scrim/60 text-bg backdrop-blur-[1px] transition-colors group-hover:bg-scrim/70 dark:text-ink">
					<span className="t-display text-title">+{overflow}</span>
				</span>
			)}
		</button>
	);
}

interface EventLightboxProps {
	images: string[];
	title: string;
	index: number | null;
	/** transform-origin of the panel: the tapped tile's centre in viewport percentages. */
	origin?: string;
	onClose: () => void;
	onIndex: (i: number) => void;
}

/** Siblings slide in unison: incoming from the travel side, outgoing the other way, no scale. */
const SLIDE = {
	enter: (dir: number) => ({ x: SLIDE_PX * dir, opacity: 0 }),
	center: { x: 0, opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
	exit: (dir: number) => ({
		x: -SLIDE_PX * dir,
		opacity: 0,
		transition: { duration: DUR.fast, ease: EASE_IN },
	}),
};

function EventLightbox({
	images,
	title,
	index,
	origin,
	onClose,
	onIndex,
}: Readonly<EventLightboxProps>) {
	const isOpen = index !== null;
	const [dir, setDir] = useState<1 | -1>(1);

	const go = useCallback(
		(step: 1 | -1) => {
			if (index === null) return;
			setDir(step);
			onIndex((index + step + images.length) % images.length);
		},
		[index, images.length, onIndex],
	);

	// Track both axes and only page when the gesture is mostly horizontal, so a
	// vertical scroll with a little drift never changes the photo.
	const touchStart = useRef({ x: 0, y: 0 });
	const onTouchStart = useCallback((e: React.TouchEvent) => {
		const t = e.touches[0];
		if (t) touchStart.current = { x: t.clientX, y: t.clientY };
	}, []);
	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const t = e.changedTouches[0];
			if (!t) return;
			const dx = t.clientX - touchStart.current.x;
			const dy = t.clientY - touchStart.current.y;
			if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? -1 : 1);
		},
		[go],
	);

	const hasMany = images.length > 1;

	return (
		<AnimatePresence>
			{isOpen && index !== null ? (
				<ViewerDialog
					label={`${title} photos`}
					onClose={onClose}
					onNext={hasMany ? () => go(1) : undefined}
					onPrevious={hasMany ? () => go(-1) : undefined}
				>
					<motion.figure
						initial={{ opacity: 0, scale: 0.96, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{
							opacity: 0,
							scale: 0.98,
							y: 8,
							transition: { duration: DUR.fast, ease: EASE_IN },
						}}
						transition={SPRING_PANEL}
						style={{ transformOrigin: origin }}
						onTouchStart={onTouchStart}
						onTouchEnd={onTouchEnd}
						className="relative z-raised m-0 flex w-full max-w-5xl flex-col items-center"
					>
						{/* The image sizes to its own ratio (capped by the viewport), so the
						    whole photo shows uncropped whatever its dimensions. */}
						<div className="relative flex max-h-[80svh] w-full items-center justify-center">
							<AnimatePresence mode="popLayout" custom={dir} initial={false}>
								<motion.div
									key={index}
									custom={dir}
									variants={SLIDE}
									initial="enter"
									animate="center"
									exit="exit"
									className="flex max-h-[80svh] w-full items-center justify-center"
								>
									<ResponsiveImage
										keyBase={images[index] ?? ""}
										alt={`${title}, photo ${index + 1} of ${images.length}`}
										sizes="(min-width: 1088px) 1024px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
										priority
										className="max-h-[80svh] w-auto max-w-full rounded-(--radius-lg) border border-line bg-canvas object-contain shadow-e5"
									/>
								</motion.div>
							</AnimatePresence>
							{hasMany ? (
								<>
									<LightboxNav direction="prev" onClick={() => go(-1)} />
									<LightboxNav direction="next" onClick={() => go(1)} />
								</>
							) : null}
						</div>
						<figcaption className="mt-3 flex w-full items-center justify-between gap-3 text-xs text-muted">
							<span className="min-w-0 truncate">{title}</span>
							{hasMany ? (
								<span className="shrink-0 tabular-nums">
									{index + 1} / {images.length}
								</span>
							) : null}
						</figcaption>
					</motion.figure>
				</ViewerDialog>
			) : null}
		</AnimatePresence>
	);
}

function LightboxNav({
	direction,
	onClick,
}: Readonly<{ direction: "prev" | "next"; onClick: () => void }>) {
	const isPrev = direction === "prev";
	return (
		<LightboxIconButton
			onClick={onClick}
			aria-label={isPrev ? "Previous photo" : "Next photo"}
			className={cn(
				"absolute top-1/2 z-raised -translate-y-1/2 pointer-coarse:size-12",
				isPrev
					? "left-[max(--spacing(3),var(--spacing-safe-left))]"
					: "right-[max(--spacing(3),var(--spacing-safe-right))]",
			)}
		>
			{isPrev ? (
				<ArrowLeft size={18} aria-hidden="true" />
			) : (
				<ArrowRight size={18} aria-hidden="true" />
			)}
		</LightboxIconButton>
	);
}

"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BinduMark } from "@/components/decor/bindu-mark";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { LightboxIconButton, ViewerDialog } from "@/components/gallery/viewer-dialog";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { IMAGE_ORIGIN, VARIANT_WIDTHS } from "@/lib/image-base";
import {
	DRAG_CLOSE_FRACTION,
	DRAG_VELOCITY_PX_S,
	DUR,
	EASE_IN,
	EASE_OUT,
	gridStaggerDelay,
	SPRING_PANEL,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Inline photo grid for one event, with an image-only lightbox.
 *
 * The grid is the photo recap of a dated exhibition record (visual-direction
 * 2.6): uncropped square tiles on PlateFrame (no gold at rest), the plate
 * unveil clipped INSIDE the frame so the hover lift and shadow are never
 * cropped, up to MAX_INLINE tiles inline and a "+N more" overlay on the last.
 *
 * The lightbox mirrors the gallery's v2 room (2.4): the deep-ink scrim, the
 * Motion drag that pages with the finger and dismisses downward while the
 * scrim tracks progress, the same counter and arrow chrome, and the caption
 * as scrim wall text with the Gond bindu mark. No sidebar, no palette glow,
 * no buy bar (this is documentation, not commerce). Paging loops only with
 * 3 or more photos; a single photo hides arrows and paging entirely.
 */
const MAX_INLINE = 6;
/** Sibling slide distance (px) when paging inside the lightbox. */
const SLIDE_PX = 24;
/** Scrim fade factor while a downward dismiss drag is in flight (1.7). */
const SCRIM_DRAG_FADE = 0.6;
/** Paging wraps around only from this many photos (2.4). */
const LOOP_MIN = 3;
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
/** Shared by the displayed photo and neighbour preloads at every viewport. */
const LIGHTBOX_IMAGE_SIZES =
	"(min-width: 1088px) 1024px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)";

/** AVIF srcset for an event key-base, for `<link rel="preload">` hints. */
function eventPreloadSrcset(keyBase: string): string {
	return VARIANT_WIDTHS.map((w) => `${IMAGE_ORIGIN}/${keyBase}-${w}.avif ${w}w`).join(", ");
}

interface EventGalleryProps {
	images: string[];
	title: string;
	/**
	 * True on the page's first gallery only: its first tile is the route's
	 * LCP candidate, so it fetches at high priority and skips the clip unveil
	 * (performance guard 3), and its siblings unveil eagerly on first paint.
	 */
	lead?: boolean;
}

export function EventGallery({ images, title, lead = false }: Readonly<EventGalleryProps>) {
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
								priority={lead && i === 0}
								eager={lead}
								overflow={showOverflow ? overflow : undefined}
								totalForLabel={showOverflow ? images.length : undefined}
								onOpen={(tile) => open(i, tile)}
							/>
						</li>
					);
				})}
			</ul>

			<AnimatePresence>
				{lightboxAt !== null ? (
					<EventLightbox
						key="event-lightbox"
						images={images}
						title={title}
						index={lightboxAt}
						origin={origin}
						onClose={() => setLightboxAt(null)}
						onIndex={setLightboxAt}
					/>
				) : null}
			</AnimatePresence>
		</>
	);
}

interface PhotoTileProps {
	keyBase: string;
	title: string;
	index: number;
	aspect: string;
	sizes: string;
	/** LCP tile: high-priority fetch, rendered without the clip unveil. */
	priority?: boolean;
	/** Unveil on first paint (the lead gallery); later galleries unveil in view. */
	eager?: boolean;
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
	eager = false,
	overflow,
	totalForLabel,
	onOpen,
}: Readonly<PhotoTileProps>) {
	const image = (
		<ResponsiveImage
			keyBase={keyBase}
			alt={`${title}, photo ${index + 1}`}
			sizes={sizes}
			priority={priority}
			className="absolute inset-0 h-full w-full object-contain"
		/>
	);
	return (
		<button
			type="button"
			onClick={(e) => onOpen(e.currentTarget)}
			aria-label={
				overflow !== undefined && totalForLabel !== undefined
					? `View all ${totalForLabel} photos from ${title}`
					: `View photo ${index + 1} from ${title}`
			}
			className="group pressable relative block w-full rounded-(--radius-md)"
		>
			{/* The frame lifts on hover (PlateFrame elevate + gold inset); the photo
			    itself never scales, and the unveil clips inside the frame so the
			    lift's shadow is never cropped by a lingering clip-path. */}
			<PlateFrame className={aspect}>
				{priority ? (
					image
				) : (
					<Reveal
						variant="plate"
						eager={eager}
						delayMs={gridStaggerDelay(index, MAX_INLINE, 3)}
						className="absolute inset-0"
					>
						{image}
					</Reveal>
				)}
				{overflow === undefined ? null : (
					<span className="absolute inset-0 grid place-items-center bg-scrim/60 text-bg backdrop-blur-[1px] transition-colors group-hover:bg-scrim/70 dark:text-ink">
						<span className="t-display text-title">+{overflow}</span>
					</span>
				)}
			</PlateFrame>
		</button>
	);
}

interface EventLightboxProps {
	images: string[];
	title: string;
	index: number;
	/** transform-origin of the panel: the tapped tile's centre in viewport percentages. */
	origin?: string;
	onClose: () => void;
	onIndex: (i: number) => void;
}

/** The gallery lightbox's room, mirrored for event photos (2.4 events mirror). */
function EventLightbox({
	images,
	title,
	index,
	origin,
	onClose,
	onIndex,
}: Readonly<EventLightboxProps>) {
	const reduceMotion = usePrefersReducedMotion();
	const [dir, setDir] = useState<1 | -1>(1);
	const figureRef = useRef<HTMLDivElement>(null);
	const scrimOpacity = useMotionValue(1);

	const total = images.length;
	const hasMany = total > 1;
	const loops = total >= LOOP_MIN;

	// Coarse = no fine hover pointer; drives the drag paging and dismiss.
	const [coarse, setCoarse] = useState(false);
	useEffect(() => {
		const mql = globalThis.matchMedia(FINE_POINTER_QUERY);
		setCoarse(!mql.matches);
		const handler = (e: MediaQueryListEvent) => setCoarse(!e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const go = useCallback(
		(step: 1 | -1) => {
			const next = loops
				? (index + step + total) % total
				: Math.min(Math.max(index + step, 0), total - 1);
			if (next === index) return;
			setDir(step);
			onIndex(next);
		},
		[index, total, loops, onIndex],
	);
	const goFirst = useCallback(() => {
		if (index === 0) return;
		setDir(-1);
		onIndex(0);
	}, [index, onIndex]);
	const goLast = useCallback(() => {
		if (index === total - 1) return;
		setDir(1);
		onIndex(total - 1);
	}, [index, total, onIndex]);

	// Warm one photo behind and two ahead once the current one settles, so
	// arrow/swipe paging is near-instant. Skipped under Save-Data and reduced
	// motion (the gallery's contract, mirrored).
	useEffect(() => {
		if (!hasMany) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData || reduceMotion) return;
		const neighbours = [
			images[(index + 1) % total],
			images[(index + 2) % total],
			images[(index - 1 + total) % total],
		];
		const keys = new Set(neighbours.filter((key): key is string => Boolean(key)));
		keys.delete(images[index] ?? "");
		const preloads = [...keys].map((keyBase) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "image";
			link.type = "image/avif";
			link.imageSrcset = eventPreloadSrcset(keyBase);
			link.imageSizes = LIGHTBOX_IMAGE_SIZES;
			document.head.append(link);
			return link;
		});
		return () => {
			for (const preload of preloads) preload.remove();
		};
	}, [hasMany, images, index, total, reduceMotion]);

	// Drag: pages horizontally, dismisses downward; the scrim tracks progress.
	const handleDrag = useCallback(
		(_event: unknown, info: PanInfo) => {
			const rect = figureRef.current?.getBoundingClientRect();
			const height = rect?.height ?? 1;
			const progress = Math.min(Math.max(info.offset.y / height, 0), 1);
			scrimOpacity.set(1 - SCRIM_DRAG_FADE * progress);
		},
		[scrimOpacity],
	);
	const handleDragEnd = useCallback(
		(_event: unknown, info: PanInfo) => {
			scrimOpacity.set(1);
			const rect = figureRef.current?.getBoundingClientRect();
			const width = rect?.width ?? 1;
			const height = rect?.height ?? 1;
			const { offset, velocity } = info;
			if (
				hasMany &&
				(offset.x < -DRAG_CLOSE_FRACTION * width || velocity.x < -DRAG_VELOCITY_PX_S)
			) {
				go(1);
				return;
			}
			if (hasMany && (offset.x > DRAG_CLOSE_FRACTION * width || velocity.x > DRAG_VELOCITY_PX_S)) {
				go(-1);
				return;
			}
			if (offset.y > DRAG_CLOSE_FRACTION * height || velocity.y > DRAG_VELOCITY_PX_S) {
				onClose();
			}
		},
		[scrimOpacity, hasMany, go, onClose],
	);

	/** Siblings slide 24px from the travel side; reduced motion crossfades. */
	const pageVariants = {
		enter: (d: number) => (reduceMotion ? { opacity: 0 } : { x: SLIDE_PX * d, opacity: 0 }),
		center: { x: 0, opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
		exit: (d: number) =>
			reduceMotion
				? { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }
				: { x: -SLIDE_PX * d, opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } },
	};

	const counterText = `${String(index + 1).padStart(2, "0")} / ${total}`;

	return (
		<ViewerDialog
			label={`${title} photos`}
			onClose={onClose}
			onNext={hasMany ? () => go(1) : undefined}
			onPrevious={hasMany ? () => go(-1) : undefined}
			onFirst={hasMany ? goFirst : undefined}
			onLast={hasMany ? goLast : undefined}
			scrimOpacity={scrimOpacity}
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
				className="relative z-raised m-0 flex w-full max-w-5xl flex-col items-center"
			>
				{/* One live region announces paging; the visible counter is chrome. */}
				{hasMany ? (
					<p className="sr-only" aria-live="polite" aria-atomic="true">
						{index + 1} of {total}
					</p>
				) : null}
				<div className="relative flex max-h-[70dvh] w-full items-center justify-center md:max-h-[78dvh]">
					{hasMany ? (
						<p
							aria-hidden="true"
							className="t-meta absolute left-1 top-1 z-raised tabular-nums text-bg/80 dark:text-ink/80"
						>
							{counterText}
						</p>
					) : null}
					<AnimatePresence mode="popLayout" custom={dir} initial={false}>
						<motion.div
							key={index}
							ref={figureRef}
							custom={dir}
							variants={pageVariants}
							initial="enter"
							animate="center"
							exit="exit"
							drag={coarse}
							dragDirectionLock
							dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
							dragElastic={0.2}
							onDrag={coarse ? handleDrag : undefined}
							onDragEnd={coarse ? handleDragEnd : undefined}
							className="flex max-h-[70dvh] w-full items-center justify-center md:max-h-[78dvh]"
						>
							<ResponsiveImage
								keyBase={images[index] ?? ""}
								alt={`${title}, photo ${index + 1} of ${total}`}
								sizes={LIGHTBOX_IMAGE_SIZES}
								priority
								className="max-h-[70dvh] w-auto max-w-full select-none rounded-(--radius-lg) bg-canvas object-contain shadow-hairline md:max-h-[78dvh]"
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
				{/* Caption as scrim wall text: the Gond bindu mark, then the event
				    title in the titled-work voice (2.6 figure captions). */}
				<figcaption className="mt-3 flex w-full min-w-0 items-center gap-2 text-bg dark:text-ink">
					<BinduMark className="opacity-80" />
					<span className="t-display min-w-0 truncate text-h3">{title}</span>
				</figcaption>
			</motion.figure>
		</ViewerDialog>
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
				"absolute bottom-3 z-raised pointer-coarse:size-12 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:border-bg/20 md:bg-bg/10 md:text-bg md:dark:text-ink",
				isPrev ? "left-3 md:left-safe-left md:ml-3" : "right-3 md:right-safe-right md:mr-3",
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

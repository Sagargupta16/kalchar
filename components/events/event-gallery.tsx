"use client";

import { ArrowLeft, ArrowRight, Expand } from "lucide-react";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { BinduMark } from "@/components/decor/bindu-mark";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { useViewerDrag } from "@/components/gallery/use-viewer-drag";
import { LightboxIconButton, ViewerDialog } from "@/components/gallery/viewer-dialog";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { IMAGE_ORIGIN, VARIANT_WIDTHS } from "@/lib/image-base";
import { DUR, EASE_IN, SPRING_PANEL } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { EVENT_LIGHTBOX_IMAGE_SIZES, EventLightboxPhoto } from "./event-lightbox-photo";
import "@/components/editorial/editorial.css";

/**
 * Inline photo mosaic for one event, with an image-only lightbox.
 *
 * The mosaic is the photo recap of a dated record: a masonry of up to five
 * photos (two columns on phones, three from sm), each frame at the photo's
 * own ratio so shots of every shape sit edge to edge and whole, the last
 * carrying a "+N" overlay when there are more. When the
 * mosaic scrolls in, each tile wipes up from its bottom edge while the photo
 * settles from 1.12, rippling across the set; the page's lead mosaic plays on
 * first paint and its cover (the LCP) skips the clip.
 *
 * The lightbox mirrors the gallery's v2 room (2.4): the deep-ink scrim, the
 * Motion drag that pages with the finger and dismisses downward while the
 * scrim tracks progress, the same counter and arrow chrome, and the caption
 * as scrim wall text with the Gond bindu mark. No sidebar, no palette glow,
 * no buy bar (this is documentation, not commerce). Paging loops only with
 * 3 or more photos; a single photo hides arrows and paging entirely.
 */
const MAX_INLINE = 5;
/** Paging wraps around only from this many photos (2.4). */
const LOOP_MIN = 3;
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/** AVIF srcset for an event key-base, for `<link rel="preload">` hints. */
function eventPreloadSrcset(keyBase: string): string {
	return VARIANT_WIDTHS.map((w) => `${IMAGE_ORIGIN}/${keyBase}-${w}.avif ${w}w`).join(", ");
}

interface EventGalleryProps {
	images: string[];
	title: string;
	/**
	 * True on the page's first gallery only: its first tile is the route's
	 * LCP candidate, so it fetches at high priority and skips the clip unveil,
	 * and its siblings unveil on first paint.
	 */
	lead?: boolean;
}

/** Masonry columns and image sizes for a given photo count. */
function mosaicLayout(count: number): { columns: string; sizes: string } {
	if (count === 1) {
		return { columns: "max-w-3xl", sizes: "(min-width: 1152px) 768px, 100vw" };
	}
	if (count === 2) {
		return { columns: "columns-2", sizes: "(min-width: 1152px) 420px, 50vw" };
	}
	return {
		columns: "columns-2 sm:columns-3",
		sizes: "(min-width: 1152px) 280px, (min-width: 640px) 30vw, 50vw",
	};
}

/** Frame ratio before a photo decodes (the common phone landscape shot). */
const PLACEHOLDER_RATIO = 4 / 3;

export function EventGallery({ images, title, lead = false }: Readonly<EventGalleryProps>) {
	const [lightboxAt, setLightboxAt] = useState<number | null>(null);
	const [origin, setOrigin] = useState<string | undefined>(undefined);
	const [revealRef, revealState] = useViewReveal<HTMLUListElement>();

	if (images.length === 0) return null;

	const inline = images.slice(0, MAX_INLINE);
	// The overflow tile sits on the last inline slot and covers its own photo, so
	// that photo counts toward "+N" too: N = total - the (MAX_INLINE - 1) tiles
	// that stay individually viewable. Only overflow once we actually exceed the
	// mosaic, so an exact-fit set (length === MAX_INLINE) shows every tile clean.
	const overflow = images.length > MAX_INLINE ? images.length - (MAX_INLINE - 1) : 0;
	const layout = mosaicLayout(inline.length);

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
			<p className="mb-3 flex items-center gap-2 text-sm text-muted">
				<Expand size={14} aria-hidden="true" />
				{images.length === 1 ? "1 photo" : `${images.length} photos`}. Select a photo to enlarge.
			</p>
			<ul
				ref={revealRef}
				data-mosaic={lead ? undefined : revealState}
				className={cn("gap-2 sm:gap-3", layout.columns)}
			>
				{inline.map((keyBase, i) => {
					const showOverflow = overflow > 0 && i === MAX_INLINE - 1;
					return (
						<li key={keyBase} className="mb-2 break-inside-avoid sm:mb-3">
							<PhotoTile
								keyBase={keyBase}
								title={title}
								index={i}
								sizes={layout.sizes}
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
	sizes: string;
	/** LCP tile: high-priority fetch, rendered without the clip unveil. */
	priority?: boolean;
	/** Unveil on first paint (the lead mosaic); later mosaics unveil in view. */
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
	sizes,
	priority = false,
	eager = false,
	overflow,
	totalForLabel,
	onOpen,
}: Readonly<PhotoTileProps>) {
	// The frame takes the photo's own ratio once it decodes (placeholder until
	// then), so every shot sits edge to edge and whole: nothing is cropped.
	const [ratio, setRatio] = useState(PLACEHOLDER_RATIO);
	/* Three layers, one transform each: the frame lifts on hover (PlateFrame
	   elevate + gold inset), the wipe clips inside the frame so the lift's
	   shadow is never cropped, and the photo settles then zooms on hover. */
	const photo = (
		<div className="tile-settle absolute inset-0">
			<div className="absolute inset-0 transition-transform duration-(--duration-unveil) ease-(--ease-out) group-hover:scale-[1.06]">
				<ResponsiveImage
					keyBase={keyBase}
					alt={`${title}, photo ${index + 1}`}
					sizes={sizes}
					priority={priority}
					onNaturalSize={(w, h) => setRatio(w / h)}
					className="absolute inset-0 h-full w-full object-contain"
				/>
			</div>
		</div>
	);
	const plate = (
		<PlateFrame className="absolute inset-0">
			{priority ? (
				photo
			) : (
				<div
					className={cn("tile-wipe absolute inset-0", eager && "tile-wipe-eager")}
					style={{ "--i": index } as CSSProperties}
				>
					{photo}
				</div>
			)}
			{overflow === undefined ? null : (
				<span className="absolute inset-0 grid place-items-center bg-scrim/60 text-bg transition-colors group-hover:bg-scrim/70 dark:text-ink">
					<span className="text-center">
						<span className="t-display block text-title">+{overflow}</span>
						<span className="text-sm">View photos</span>
					</span>
				</span>
			)}
		</PlateFrame>
	);
	return (
		<button
			type="button"
			onClick={(e) => onOpen(e.currentTarget)}
			aria-haspopup="dialog"
			aria-label={
				overflow !== undefined && totalForLabel !== undefined
					? `View all ${totalForLabel} photos from ${title}`
					: `View photo ${index + 1} from ${title}`
			}
			style={{ aspectRatio: ratio }}
			className="group pressable relative block w-full rounded-(--radius-md)"
		>
			{/* Only the page's lead cover idles on the float breath: one plate per
			    page, never the whole mosaic. The wrapper sits between the pressable
			    button and the hover-lifting frame so no transform fights another. */}
			{priority ? (
				<div
					className="plate-float absolute inset-0"
					style={{ "--float-travel": "4px" } as CSSProperties}
				>
					{plate}
				</div>
			) : (
				plate
			)}
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
	// arrow/swipe paging is near-instant. Skipped under Save-Data.
	useEffect(() => {
		if (!hasMany) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData) return;
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
			link.imageSizes = EVENT_LIGHTBOX_IMAGE_SIZES;
			document.head.append(link);
			return link;
		});
		return () => {
			for (const preload of preloads) preload.remove();
		};
	}, [hasMany, images, index, total]);

	const navigation = hasMany
		? {
				onNext: () => go(1),
				onPrevious: () => go(-1),
				onFirst: goFirst,
				onLast: goLast,
			}
		: {};
	const dragHandlers = useViewerDrag({
		figureRef,
		scrimOpacity,
		onNext: navigation.onNext,
		onPrevious: navigation.onPrevious,
		onDismiss: onClose,
	});

	const counterText = `${String(index + 1).padStart(2, "0")} / ${total}`;

	return (
		<ViewerDialog
			label={`${title} photos`}
			onClose={onClose}
			{...navigation}
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
				<div className="relative flex h-[70dvh] w-full items-center justify-center md:h-[78dvh]">
					{hasMany ? (
						<p
							aria-hidden="true"
							className="t-meta absolute left-1 top-1 z-raised rounded-md bg-scrim-deep px-2 py-1 tabular-nums text-bg dark:text-ink"
						>
							{counterText}
						</p>
					) : null}
					<EventLightboxPhoto
						keyBase={images[index] ?? ""}
						index={index}
						title={title}
						total={total}
						direction={dir}
						coarse={coarse}
						figureRef={figureRef}
						dragHandlers={dragHandlers}
					/>
					{hasMany ? (
						<>
							<LightboxNav
								direction="prev"
								unavailable={!loops && index === 0}
								onClick={() => go(-1)}
							/>
							<LightboxNav
								direction="next"
								unavailable={!loops && index === total - 1}
								onClick={() => go(1)}
							/>
						</>
					) : null}
				</div>
				{/* Caption as scrim wall text: the Gond bindu mark, then the event
				    title in the titled-work voice (2.6 figure captions). */}
				<figcaption className="mt-3 flex w-full min-w-0 items-center gap-2 text-bg dark:text-ink">
					<BinduMark className="opacity-80" />
					<span className="t-display min-w-0 line-clamp-2 text-h3">{title}</span>
				</figcaption>
			</motion.figure>
		</ViewerDialog>
	);
}

function LightboxNav({
	direction,
	unavailable,
	onClick,
}: Readonly<{ direction: "prev" | "next"; unavailable: boolean; onClick: () => void }>) {
	const isPrev = direction === "prev";
	return (
		<LightboxIconButton
			onClick={unavailable ? undefined : onClick}
			aria-disabled={unavailable}
			aria-label={isPrev ? "Previous photo" : "Next photo"}
			className={cn(
				"absolute bottom-3 z-raised pointer-coarse:size-12 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:border-bg/20 md:bg-bg/10 md:text-bg md:dark:text-ink",
				isPrev ? "left-3 md:left-safe-left md:ml-3" : "right-3 md:right-safe-right md:mr-3",
				unavailable && "cursor-default opacity-40",
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

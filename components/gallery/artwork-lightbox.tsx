"use client";

import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { AnimatePresence, motion, type PanInfo, useMotionValue } from "motion/react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { getCtaCopy, isPositivePrice, mostSaturatedSwatch } from "@/lib/catalog";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { artworkPreloadSrcset } from "@/lib/image-base";
import {
	DRAG_CLOSE_FRACTION,
	DRAG_VELOCITY_PX_S,
	DUR,
	EASE_IN,
	EASE_OUT,
	SPRING_PANEL,
	SPRING_ZOOM,
} from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, buyArtworkMessage } from "@/lib/whatsapp";
import { ArtImage } from "./art-image";
import { ArtworkStatusBadge } from "./artwork-status-badge";
import { useLightbox } from "./lightbox-context";
import { KEYBOARD_PAN_PX, useLightboxGestures } from "./lightbox-gestures";
import { LightboxSidebar } from "./lightbox-sidebar";
import { LightboxIconButton, ViewerDialog } from "./viewer-dialog";

/** Shared by the displayed picture and neighbour preloads at every viewport. */
const LIGHTBOX_IMAGE_SIZES =
	"(min-width: 1024px) 640px, (min-width: 768px) 60vw, calc(100vw - 64px)";

/* Local motion constants (visual-direction 2.4); the zoom/tap gesture
 * constants live with their cluster in lightbox-gestures.ts. */
/** Sibling slide travel for page next / prev (G4). */
const PAGE_SLIDE_PX = 24;
/** Scrim fade factor while a downward dismiss drag is in flight (1.7). */
const SCRIM_DRAG_FADE = 0.6;
/** Panel travel when a committed downward drag dismisses the viewer (the
 *  2.4 motion table's dismiss row); the generic close keeps its y+8 exit. */
const DISMISS_EXIT_Y = 32;

export function ArtworkLightbox() {
	const context = useLightbox();
	const { isOpen, activeArtwork, artworksList } = context;
	const reduceMotion = usePrefersReducedMotion();

	// Warm one piece behind and two ahead once the current piece settles, so
	// arrow/swipe to the next plate is near-instant (visual-direction 2.4).
	// Skipped under Save-Data (metered connections) to not spend bytes a user
	// asked us to conserve.
	useEffect(() => {
		if (!isOpen || !activeArtwork || artworksList.length < 2) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData || reduceMotion) return;
		const i = artworksList.findIndex((a) => a.slug === activeArtwork.slug);
		if (i === -1) return;
		const n = artworksList.length;
		const neighbours = [
			artworksList[(i + 1) % n],
			artworksList[(i + 2) % n],
			artworksList[(i - 1 + n) % n],
		];
		const images = new Set(neighbours.flatMap((artwork) => (artwork ? [artwork.image] : [])));
		images.delete(activeArtwork.image);
		const preloads = [...images].map((image) => {
			const link = document.createElement("link");
			link.rel = "preload";
			link.as = "image";
			link.type = "image/avif";
			link.imageSrcset = artworkPreloadSrcset(image);
			link.imageSizes = LIGHTBOX_IMAGE_SIZES;
			document.head.append(link);
			return link;
		});
		return () => {
			for (const preload of preloads) preload.remove();
		};
	}, [isOpen, activeArtwork, artworksList, reduceMotion]);

	return (
		<AnimatePresence>
			{isOpen && activeArtwork ? <LightboxContent key="lightbox" artwork={activeArtwork} /> : null}
		</AnimatePresence>
	);
}

function LightboxContent({ artwork }: Readonly<{ artwork: Artwork }>) {
	const {
		artworksList,
		whatsappPhone,
		origin: tapOrigin,
		openLightbox,
		closeLightbox,
		nextArtwork,
		prevArtwork,
	} = useLightbox();
	const reduceMotion = usePrefersReducedMotion();

	const total = artworksList.length;
	const position = artworksList.findIndex((a) => a.slug === artwork.slug) + 1;
	const hasSiblings = total > 1;
	const isAvailable = isPositivePrice(artwork.priceInr);
	const isSold = artwork.status === "sold";
	const cta = getCtaCopy(isAvailable, isSold);
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: whatsappPhone,
		message: buyArtworkMessage(artwork),
	});
	const glow = mostSaturatedSwatch(artwork.palette);

	const [chromeHidden, setChromeHidden] = useState(false);
	const [dir, setDir] = useState(1);
	const scrimOpacity = useMotionValue(1);
	const toggleChrome = useCallback(() => setChromeHidden((current) => !current), []);

	// Zoom, pinch, tap and hover gestures (split out for the 500-line ceiling).
	const {
		coarse,
		level,
		zoomed,
		zoomOrigin,
		pan,
		figureRef,
		resetZoom,
		panBy,
		zoomIn,
		zoomOut,
		handleTap,
		handlePointerDown,
		handlePointerMove,
		releasePointer,
		handleMouseMove,
		handleMouseEnter,
		handleMouseLeave,
	} = useLightboxGestures({ artwork, onToggleChrome: toggleChrome });

	// The dismiss drag's scrim fade re-arms whenever the piece changes (2.4).
	// biome-ignore lint/correctness/useExhaustiveDependencies: artwork.slug keys the reset to piece changes
	useEffect(() => {
		scrimOpacity.set(1);
	}, [artwork.slug, scrimOpacity]);

	const goNext = useCallback(() => {
		resetZoom();
		setDir(1);
		nextArtwork();
	}, [resetZoom, nextArtwork]);
	const goPrev = useCallback(() => {
		resetZoom();
		setDir(-1);
		prevArtwork();
	}, [resetZoom, prevArtwork]);
	const goFirst = useCallback(() => {
		const first = artworksList[0];
		if (!first || first.slug === artwork.slug) return;
		resetZoom();
		setDir(-1);
		openLightbox(first, artworksList);
	}, [artworksList, artwork.slug, resetZoom, openLightbox]);
	const goLast = useCallback(() => {
		const last = artworksList.at(-1);
		if (!last || last.slug === artwork.slug) return;
		resetZoom();
		setDir(1);
		openLightbox(last, artworksList);
	}, [artworksList, artwork.slug, resetZoom, openLightbox]);

	// --- Drag: pages horizontally, dismisses downward (coarse, at fit) ---
	const dismissedRef = useRef(false);
	const handleDrag = useCallback(
		(_event: unknown, info: PanInfo) => {
			const rect = figureRef.current?.getBoundingClientRect();
			const height = rect?.height ?? 1;
			const progress = Math.min(Math.max(info.offset.y / height, 0), 1);
			scrimOpacity.set(1 - SCRIM_DRAG_FADE * progress);
		},
		[figureRef, scrimOpacity],
	);
	const handleDragEnd = useCallback(
		(_event: unknown, info: PanInfo) => {
			scrimOpacity.set(1);
			const rect = figureRef.current?.getBoundingClientRect();
			const width = rect?.width ?? 1;
			const height = rect?.height ?? 1;
			const { offset, velocity } = info;
			if (
				hasSiblings &&
				(offset.x < -DRAG_CLOSE_FRACTION * width || velocity.x < -DRAG_VELOCITY_PX_S)
			) {
				goNext();
				return;
			}
			if (
				hasSiblings &&
				(offset.x > DRAG_CLOSE_FRACTION * width || velocity.x > DRAG_VELOCITY_PX_S)
			) {
				goPrev();
				return;
			}
			if (offset.y > DRAG_CLOSE_FRACTION * height || velocity.y > DRAG_VELOCITY_PX_S) {
				dismissedRef.current = true;
				closeLightbox();
			}
		},
		[scrimOpacity, figureRef, hasSiblings, goNext, goPrev, closeLightbox],
	);

	const pageVariants = {
		enter: (d: number) => (reduceMotion ? { opacity: 0 } : { x: PAGE_SLIDE_PX * d, opacity: 0 }),
		center: {
			x: 0,
			opacity: 1,
			transition: { duration: DUR.base, ease: EASE_OUT },
		},
		exit: (d: number) =>
			reduceMotion
				? { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }
				: {
						x: -PAGE_SLIDE_PX * d,
						opacity: 0,
						transition: { duration: DUR.fast, ease: EASE_IN },
					},
	};

	// Generic close exits y+8; a committed dismiss leaves on the y+32 row (2.4).
	const panelVariants = {
		enter: { opacity: 0, scale: 0.96, y: 12 },
		center: { opacity: 1, scale: 1, y: 0 },
		exit: () => ({
			opacity: 0,
			scale: 0.98,
			y: dismissedRef.current ? DISMISS_EXIT_Y : 8,
			transition: { duration: DUR.fast, ease: EASE_IN },
		}),
	};

	// Hidden chrome leaves the tab order and the accessibility tree (inert),
	// not just the paint: opacity-0 alone stays keyboard-focusable on hybrid
	// touch + keyboard devices.
	const chromeClass = cn("transition-ui", chromeHidden && "pointer-events-none opacity-0");
	const counterText = `${String(position).padStart(2, "0")} / ${total}`;

	return (
		<ViewerDialog
			labelledBy="lightbox-title"
			onClose={closeLightbox}
			onNext={hasSiblings ? (zoomed ? () => panBy(-KEYBOARD_PAN_PX, 0) : goNext) : undefined}
			onPrevious={hasSiblings ? (zoomed ? () => panBy(KEYBOARD_PAN_PX, 0) : goPrev) : undefined}
			onFirst={hasSiblings ? goFirst : undefined}
			onLast={hasSiblings ? goLast : undefined}
			onZoomIn={zoomIn}
			onZoomOut={zoomOut}
			onArrowUp={zoomed ? () => panBy(0, KEYBOARD_PAN_PX) : undefined}
			onArrowDown={zoomed ? () => panBy(0, -KEYBOARD_PAN_PX) : undefined}
			scrimOpacity={scrimOpacity}
		>
			{/* Panel: transparent chrome on the deep room; grows from the tapped
			    card's viewport point (G4). */}
			<motion.div
				variants={panelVariants}
				initial="enter"
				animate="center"
				exit="exit"
				transition={SPRING_PANEL}
				style={tapOrigin ? { transformOrigin: `${tapOrigin.xPct}% ${tapOrigin.yPct}%` } : undefined}
				className="relative flex h-full w-full max-w-6xl flex-col overflow-x-hidden overflow-y-auto overscroll-contain md:grid md:grid-cols-12 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
			>
				{/* One live region announces paging; the visible counters are chrome. */}
				{hasSiblings ? (
					<p className="sr-only" aria-live="polite" aria-atomic="true">
						{position} of {total}
					</p>
				) : null}
				{hasSiblings ? (
					<p
						aria-hidden="true"
						className={cn(
							"t-meta absolute left-1 top-1 z-raised tabular-nums text-bg/80 dark:text-ink/80 md:hidden",
							chromeClass,
						)}
					>
						{counterText}
					</p>
				) : null}

				{/* Plate room: the browser owns pinch on the layers we track; Motion
				    owns the paging/dismiss drag at fit. */}
				<div className="relative flex min-h-0 flex-1 items-center justify-center p-(--card-pad) md:col-span-8">
					{/* Paging arrows keep the icon buttons' glass material at every
					    width (steering 2026-09-14): the old md ghost fills (bg/10)
					    washed out beside bright plates; the raised glass disc stays
					    legible over any painting and matches the Close control. */}
					{hasSiblings ? (
						<>
							<LightboxIconButton
								onClick={goPrev}
								aria-label="Previous artwork"
								inert={chromeHidden || undefined}
								className={cn(
									"absolute bottom-3 left-3 z-raised md:bottom-auto md:left-safe-left md:top-1/2 md:ml-3 md:-translate-y-1/2",
									chromeClass,
								)}
							>
								<ArrowLeft size={18} aria-hidden="true" />
							</LightboxIconButton>
							<LightboxIconButton
								onClick={goNext}
								aria-label="Next artwork"
								inert={chromeHidden || undefined}
								className={cn(
									"absolute bottom-3 right-3 z-raised md:bottom-auto md:right-safe-right md:top-1/2 md:mr-3 md:-translate-y-1/2",
									chromeClass,
								)}
							>
								<ArrowRight size={18} aria-hidden="true" />
							</LightboxIconButton>
						</>
					) : null}

					{/* Figure at the piece's own ratio (D9): width = min(100%, cap * ratio),
					    aspect-ratio fixes the height; 60dvh leaves room for the buy bar on
					    phones (the dialog locks scroll, so dvh is frozen), 80dvh from md. */}
					<AnimatePresence mode="popLayout" custom={dir} initial={false}>
						<motion.div
							key={artwork.slug}
							ref={figureRef}
							custom={dir}
							variants={pageVariants}
							initial="enter"
							animate="center"
							exit="exit"
							drag={coarse && !zoomed}
							dragDirectionLock
							dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
							dragElastic={0.2}
							onDrag={coarse && !zoomed ? handleDrag : undefined}
							onDragEnd={coarse && !zoomed ? handleDragEnd : undefined}
							onTap={handleTap}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={releasePointer}
							onPointerCancel={releasePointer}
							data-zoom={zoomed ? "" : undefined}
							style={{ "--plate-ratio": artwork.aspectRatio } as CSSProperties}
							className="relative aspect-(--plate-ratio) w-[min(100%,calc(var(--plate-max)*var(--plate-ratio)))] max-h-(--plate-max) [--plate-max:60dvh] md:[--plate-max:80dvh]"
						>
							{/* Palette glow: blooms in the piece's own pigment after the panel
							    settles; dims while zoomed (2.4). Inline --plate-glow is the
							    sanctioned raw-colour exception. */}
							{glow ? (
								<motion.div
									aria-hidden="true"
									initial={reduceMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: DUR.slow, delay: DUR.base, ease: EASE_OUT }}
									style={
										{
											"--plate-glow": glow,
											...(zoomed ? { "--plate-glow-alpha": "25%" } : null),
										} as CSSProperties
									}
									className="pointer-events-none absolute inset-0 rounded-(--radius-lg) shadow-glow"
								/>
							) : null}
							<figure
								className="absolute inset-0 m-0 cursor-zoom-in"
								onMouseMove={handleMouseMove}
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
							>
								<div className="relative h-full w-full overflow-hidden rounded-(--radius-lg) bg-canvas shadow-hairline">
									<motion.div
										className="h-full w-full select-none"
										style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
										animate={{ scale: level, x: pan.x, y: pan.y }}
										transition={SPRING_ZOOM}
									>
										<ArtImage
											src={`/artworks/${artwork.image}`}
											alt={artwork.description ?? artwork.title}
											sizes={LIGHTBOX_IMAGE_SIZES}
											priority
											className="h-full w-full object-contain"
										/>
									</motion.div>

									{/* Siblings of the zooming layer, so they never scale. */}
									<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} />
									<div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-scrim/80 px-2.5 py-1 text-micro uppercase tracking-meta text-bg dark:text-ink [@media(hover:hover)_and_(pointer:fine)]:inline-flex">
										<ZoomIn size={11} aria-hidden="true" />
										<span>Hover to zoom</span>
									</div>
								</div>
							</figure>
						</motion.div>
					</AnimatePresence>
				</div>

				<LightboxSidebar
					artwork={artwork}
					position={position}
					total={total}
					whatsappLink={whatsappLink}
					ctaLabel={cta.label}
					isSold={isSold}
					chromeHidden={chromeHidden}
				/>
			</motion.div>
		</ViewerDialog>
	);
}

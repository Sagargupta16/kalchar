"use client";

import { AnimatePresence, motion, type PanInfo, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import { artworkPreloadSrcset } from "@/lib/image-base";
import {
	DRAG_CLOSE_FRACTION,
	DRAG_VELOCITY_PX_S,
	DUR,
	EASE_IN,
	REVEAL_DISTANCE,
	SPRING_PANEL,
} from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { buildWhatsAppLink, buyArtworkMessage } from "@/lib/whatsapp";
import { ArtworkFilmstrip } from "./artwork-filmstrip";
import { ArtworkViewerPlate, LIGHTBOX_IMAGE_SIZES } from "./artwork-viewer-plate";
import { ArtworkViewerToolbar } from "./artwork-viewer-toolbar";
import { useLightbox } from "./lightbox-context";
import { KEYBOARD_PAN_PX, useLightboxGestures } from "./lightbox-gestures";
import { LightboxSidebar } from "./lightbox-sidebar";
import { ViewerDialog } from "./viewer-dialog";

const SCRIM_DRAG_FADE = 0.6;
const DISMISS_EXIT_Y = 32;

export function ArtworkLightbox() {
	const { isOpen, activeArtwork, artworksList } = useLightbox();

	// Neighbour requests match the displayed plate, while respecting metered connections.
	useEffect(() => {
		if (!isOpen || !activeArtwork || artworksList.length < 2) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData) return;
		const index = artworksList.findIndex((artwork) => artwork.slug === activeArtwork.slug);
		if (index === -1) return;
		const total = artworksList.length;
		const neighbours = [
			artworksList[(index + 1) % total],
			artworksList[(index + 2) % total],
			artworksList[(index - 1 + total) % total],
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
	}, [isOpen, activeArtwork, artworksList]);

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
	const total = artworksList.length;
	const position = artworksList.findIndex((item) => item.slug === artwork.slug) + 1;
	const hasSiblings = total > 1;
	const isSold = artwork.status === "sold";
	const cta = getCtaCopy(isPositivePrice(artwork.priceInr), isSold);
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: whatsappPhone,
		message: buyArtworkMessage(artwork),
	});
	const [chromeHidden, setChromeHidden] = useState(false);
	const [direction, setDirection] = useState(1);
	const scrimOpacity = useMotionValue(1);
	const toggleChrome = useCallback(() => setChromeHidden((current) => !current), []);
	const gestures = useLightboxGestures({ artwork, onToggleChrome: toggleChrome });
	const { zoomed, figureRef, resetZoom, panBy, zoomIn, zoomOut } = gestures;

	// All navigation paths restore the caption and the dismiss backdrop.
	// biome-ignore lint/correctness/useExhaustiveDependencies: artwork.slug keys this reset
	useEffect(() => {
		scrimOpacity.set(1);
		setChromeHidden(false);
	}, [artwork.slug, scrimOpacity]);

	const goNext = useCallback(() => {
		resetZoom();
		setDirection(1);
		nextArtwork();
	}, [resetZoom, nextArtwork]);
	const goPrevious = useCallback(() => {
		resetZoom();
		setDirection(-1);
		prevArtwork();
	}, [resetZoom, prevArtwork]);
	const selectArtwork = useCallback(
		(next: Artwork, navigationDirection?: 1 | -1) => {
			if (next.slug === artwork.slug) return;
			resetZoom();
			const nextIndex = artworksList.findIndex((item) => item.slug === next.slug);
			setDirection(navigationDirection ?? (nextIndex >= position ? 1 : -1));
			openLightbox(next, artworksList, tapOrigin ?? undefined);
		},
		[artwork.slug, artworksList, position, resetZoom, openLightbox, tapOrigin],
	);
	const goFirst = () => {
		const first = artworksList[0];
		if (first) selectArtwork(first);
	};
	const goLast = () => {
		const last = artworksList.at(-1);
		if (last) selectArtwork(last);
	};

	const dismissedRef = useRef(false);
	const dragAxis = useRef<"x" | "y" | null>(null);
	const handleDrag = useCallback(
		(_event: unknown, info: PanInfo) => {
			if (dragAxis.current !== "y") return;
			const height = figureRef.current?.getBoundingClientRect().height ?? 1;
			const progress = Math.min(Math.max(info.offset.y / height, 0), 1);
			scrimOpacity.set(1 - SCRIM_DRAG_FADE * progress);
		},
		[figureRef, scrimOpacity],
	);
	const handleDragEnd = useCallback(
		(_event: unknown, info: PanInfo) => {
			const axis = dragAxis.current;
			dragAxis.current = null;
			scrimOpacity.set(1);
			const rect = figureRef.current?.getBoundingClientRect();
			const width = rect?.width ?? 1;
			const height = rect?.height ?? 1;
			const { offset, velocity } = info;
			if (axis === "x") {
				if (!hasSiblings) return;
				if (offset.x < -DRAG_CLOSE_FRACTION * width || velocity.x < -DRAG_VELOCITY_PX_S) {
					goNext();
				} else if (offset.x > DRAG_CLOSE_FRACTION * width || velocity.x > DRAG_VELOCITY_PX_S) {
					goPrevious();
				}
				return;
			}
			if (
				axis === "y" &&
				(offset.y > DRAG_CLOSE_FRACTION * height || velocity.y > DRAG_VELOCITY_PX_S)
			) {
				dismissedRef.current = true;
				closeLightbox();
			}
		},
		[scrimOpacity, figureRef, hasSiblings, goNext, goPrevious, closeLightbox],
	);

	return (
		<ViewerDialog
			labelledBy="lightbox-title"
			onClose={closeLightbox}
			onNext={zoomed ? () => panBy(-KEYBOARD_PAN_PX, 0) : hasSiblings ? goNext : undefined}
			onPrevious={zoomed ? () => panBy(KEYBOARD_PAN_PX, 0) : hasSiblings ? goPrevious : undefined}
			onFirst={hasSiblings ? goFirst : undefined}
			onLast={hasSiblings ? goLast : undefined}
			onZoomIn={zoomIn}
			onZoomOut={zoomOut}
			onArrowUp={zoomed ? () => panBy(0, KEYBOARD_PAN_PX) : undefined}
			onArrowDown={zoomed ? () => panBy(0, -KEYBOARD_PAN_PX) : undefined}
			scrimOpacity={scrimOpacity}
			toolbar={
				<ArtworkViewerToolbar
					position={position}
					total={total}
					hidden={chromeHidden}
					onPrevious={goPrevious}
					onNext={goNext}
				/>
			}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: REVEAL_DISTANCE.block }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{
					opacity: 0,
					scale: 0.98,
					y: dismissedRef.current ? DISMISS_EXIT_Y : REVEAL_DISTANCE.item,
					transition: { duration: DUR.fast, ease: EASE_IN },
				}}
				transition={SPRING_PANEL}
				style={tapOrigin ? { transformOrigin: `${tapOrigin.xPct}% ${tapOrigin.yPct}%` } : undefined}
				className="relative grid h-full w-full max-w-7xl grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden pt-14 pb-safe-bottom md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:grid-rows-[minmax(0,1fr)] md:gap-6"
			>
				<p className="sr-only" aria-live="polite" aria-atomic="true">
					{artwork.title}, {position} of {total}
				</p>
				<div className="flex min-h-0 min-w-0 flex-col gap-2 px-2 pt-2">
					<ArtworkViewerPlate
						artwork={artwork}
						direction={direction}
						gestures={gestures}
						onDrag={handleDrag}
						onDragEnd={handleDragEnd}
						onDirectionLock={(axis) => {
							dragAxis.current = axis;
						}}
					/>
					<ArtworkFilmstrip
						artworks={artworksList}
						activeSlug={artwork.slug}
						hidden={chromeHidden}
						onSelect={selectArtwork}
					/>
				</div>
				<LightboxSidebar
					artwork={artwork}
					whatsappLink={whatsappLink}
					ctaLabel={cta.label}
					isSold={isSold}
					chromeHidden={chromeHidden}
				/>
			</motion.div>
		</ViewerDialog>
	);
}

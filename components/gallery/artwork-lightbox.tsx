"use client";

import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import { artworkPreloadSrcset } from "@/lib/image-base";
import { DUR, EASE_IN, REVEAL_DISTANCE, SPRING_PANEL } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { buildWhatsAppLink, buyArtworkMessage } from "@/lib/whatsapp";
import { ArtworkFilmstrip } from "./artwork-filmstrip";
import { ArtworkViewerPlate, LIGHTBOX_IMAGE_SIZES } from "./artwork-viewer-plate";
import { ArtworkViewerToolbar } from "./artwork-viewer-toolbar";
import { useLightbox } from "./lightbox-context";
import { KEYBOARD_PAN_PX, useLightboxGestures } from "./lightbox-gestures";
import { LightboxSidebar } from "./lightbox-sidebar";
import { useViewerDrag } from "./use-viewer-drag";
import { ViewerDialog } from "./viewer-dialog";
import type { ViewerKeyboardActions } from "./viewer-keyboard";

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
	const { figureRef, resetZoom } = gestures;

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
	const dismiss = useCallback(() => {
		dismissedRef.current = true;
		closeLightbox();
	}, [closeLightbox]);
	const navigation = hasSiblings
		? { onNext: goNext, onPrevious: goPrevious, onFirst: goFirst, onLast: goLast }
		: {};
	const dragHandlers = useViewerDrag({
		figureRef,
		scrimOpacity,
		onNext: navigation.onNext,
		onPrevious: navigation.onPrevious,
		onDismiss: dismiss,
	});
	const keyboardActions = getArtworkKeyboardActions(gestures, navigation);

	return (
		<ViewerDialog
			labelledBy="lightbox-title"
			onClose={closeLightbox}
			{...keyboardActions}
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
						{...dragHandlers}
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

function getArtworkKeyboardActions(
	{ zoomed, panBy, zoomIn, zoomOut }: ReturnType<typeof useLightboxGestures>,
	navigation: Omit<ViewerKeyboardActions, "onClose">,
): Omit<ViewerKeyboardActions, "onClose"> {
	const actions = { ...navigation, onZoomIn: zoomIn, onZoomOut: zoomOut };
	if (!zoomed) return actions;
	return {
		...actions,
		onNext: () => panBy(-KEYBOARD_PAN_PX, 0),
		onPrevious: () => panBy(KEYBOARD_PAN_PX, 0),
		onArrowUp: () => panBy(0, KEYBOARD_PAN_PX),
		onArrowDown: () => panBy(0, -KEYBOARD_PAN_PX),
	};
}

"use client";

import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { getCtaCopy, isPositivePrice } from "@/lib/catalog";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { artworkPreloadSrcset } from "@/lib/image-base";
import { SPRING_PANEL, SPRING_ZOOM } from "@/lib/motion";
import { buildWhatsAppLink, buyArtworkMessage } from "@/lib/whatsapp";
import { ArtImage } from "./art-image";
import { ArtworkStatusBadge } from "./artwork-status-badge";
import { useLightbox } from "./lightbox-context";
import { LightboxSidebar } from "./lightbox-sidebar";
import { LightboxIconButton, ViewerDialog } from "./viewer-dialog";

/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 50;
/** A swipe must be this many times more horizontal than vertical (axis lock). */
const SWIPE_AXIS_RATIO = 1.5;
/** Shared by the displayed picture and neighbour preloads at every viewport. */
const LIGHTBOX_IMAGE_SIZES =
	"(min-width: 1024px) 640px, (min-width: 768px) 60vw, calc(100vw - 64px)";

export function ArtworkLightbox() {
	const {
		isOpen,
		activeArtwork,
		artworksList,
		whatsappPhone,
		closeLightbox,
		nextArtwork,
		prevArtwork,
	} = useLightbox();

	const [zoom, setZoom] = useState(false);
	const [panPos, setPanPos] = useState({ x: 50, y: 50 });
	const imageRef = useRef<HTMLElement>(null);
	const reduceMotion = usePrefersReducedMotion();

	// Warm the immediate neighbours' AVIF once the current piece settles, so
	// arrow/swipe to the next plate is near-instant. One each side only, and
	// skipped under Save-Data (metered connections) to not spend bytes a user
	// asked us to conserve.
	useEffect(() => {
		if (!isOpen || !activeArtwork || artworksList.length < 2) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData || reduceMotion) return;
		const i = artworksList.findIndex((a) => a.slug === activeArtwork.slug);
		if (i === -1) return;
		const neighbours = [
			artworksList[(i + 1) % artworksList.length],
			artworksList[(i - 1 + artworksList.length) % artworksList.length],
		];
		const images = new Set(neighbours.flatMap((artwork) => (artwork ? [artwork.image] : [])));
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

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!imageRef.current || !zoom) return;
			const { left, top, width, height } = imageRef.current.getBoundingClientRect();
			setPanPos({
				x: ((e.clientX - left) / width) * 100,
				y: ((e.clientY - top) / height) * 100,
			});
		},
		[zoom],
	);

	const touchStartX = useRef(0);
	const touchStartY = useRef(0);
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		const touch = e.touches[0];
		if (touch) {
			touchStartX.current = touch.clientX;
			touchStartY.current = touch.clientY;
		}
	}, []);
	// Axis lock: a downward scroll with a little diagonal drift never flips the piece.
	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.changedTouches[0];
			if (!touch) return;
			const dx = touch.clientX - touchStartX.current;
			const dy = touch.clientY - touchStartY.current;
			if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO) {
				if (dx > 0) prevArtwork();
				else nextArtwork();
				setZoom(false);
			}
		},
		[nextArtwork, prevArtwork],
	);

	const position = activeArtwork
		? artworksList.findIndex((a) => a.slug === activeArtwork.slug) + 1
		: 0;

	return (
		<AnimatePresence>
			{isOpen && activeArtwork ? (
				<LightboxContent
					key="lightbox"
					artwork={activeArtwork}
					position={position}
					total={artworksList.length}
					whatsappPhone={whatsappPhone}
					zoom={zoom}
					panPos={panPos}
					imageRef={imageRef}
					onClose={() => {
						setZoom(false);
						closeLightbox();
					}}
					onNext={() => {
						setZoom(false);
						nextArtwork();
					}}
					onPrev={() => {
						setZoom(false);
						prevArtwork();
					}}
					onZoomEnter={() => setZoom(true)}
					onZoomLeave={() => {
						setZoom(false);
						setPanPos({ x: 50, y: 50 });
					}}
					onMouseMove={handleMouseMove}
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
				/>
			) : null}
		</AnimatePresence>
	);
}

interface LightboxContentProps {
	artwork: NonNullable<ReturnType<typeof useLightbox>["activeArtwork"]>;
	position: number;
	total: number;
	whatsappPhone: string;
	zoom: boolean;
	panPos: { x: number; y: number };
	imageRef: React.RefObject<HTMLElement | null>;
	onClose: () => void;
	onNext: () => void;
	onPrev: () => void;
	onZoomEnter: () => void;
	onZoomLeave: () => void;
	onMouseMove: (e: React.MouseEvent) => void;
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchEnd: (e: React.TouchEvent) => void;
}

function LightboxContent({
	artwork,
	position,
	total,
	whatsappPhone,
	zoom,
	panPos,
	imageRef,
	onClose,
	onNext,
	onPrev,
	onZoomEnter,
	onZoomLeave,
	onMouseMove,
	onTouchStart,
	onTouchEnd,
}: Readonly<LightboxContentProps>) {
	const hasSiblings = total > 1;
	const isAvailable = isPositivePrice(artwork.priceInr);
	const isSold = artwork.status === "sold";
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: whatsappPhone,
		message: buyArtworkMessage(artwork),
	});
	const cta = getCtaCopy(isAvailable, isSold);

	return (
		<ViewerDialog
			labelledBy="lightbox-title"
			onClose={onClose}
			onNext={hasSiblings ? onNext : undefined}
			onPrevious={hasSiblings ? onPrev : undefined}
		>
			{/* Main container: raised surface (third dark tone); overscroll-contain so a
			    swipe at the end of the sidebar never scrolls the page behind. */}
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: 12 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.96, y: 12 }}
				transition={SPRING_PANEL}
				className="relative grid h-full w-full max-w-5xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--radius-lg) border border-line bg-surface-raised shadow-e5 md:grid-cols-12 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
			>
				{/* Image panel: the browser owns vertical scroll and pinch, we read horizontal swipes. */}
				<div
					className="relative flex flex-1 touch-pan-y touch-pinch-zoom items-center justify-center bg-canvas p-(--card-pad) md:col-span-8 md:min-h-0"
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
				>
					{hasSiblings ? (
						<>
							<LightboxIconButton
								onClick={onPrev}
								aria-label="Previous artwork"
								className="absolute left-safe-left top-1/2 z-raised ml-3 -translate-y-1/2"
							>
								<ArrowLeft size={18} aria-hidden="true" />
							</LightboxIconButton>
							<LightboxIconButton
								onClick={onNext}
								aria-label="Next artwork"
								className="absolute right-safe-right top-1/2 z-raised mr-3 -translate-y-1/2"
							>
								<ArrowRight size={18} aria-hidden="true" />
							</LightboxIconButton>
						</>
					) : null}

					{/* Figure at the piece's own ratio (D9): width = min(100%, cap * ratio),
					    aspect-ratio fixes the height; the cap leaves room for the buy bar on
					    phones (55svh) and is 80svh from md. */}
					<figure
						ref={imageRef}
						onMouseMove={onMouseMove}
						onMouseEnter={onZoomEnter}
						onMouseLeave={onZoomLeave}
						style={{ "--plate-ratio": artwork.aspectRatio } as CSSProperties}
						className="relative m-0 aspect-(--plate-ratio) w-[min(100%,calc(var(--plate-max)*var(--plate-ratio)))] max-h-(--plate-max) cursor-zoom-in overflow-hidden rounded-(--radius-lg) bg-canvas shadow-hairline [--plate-max:55svh] md:[--plate-max:80svh]"
					>
						<motion.div
							className="h-full w-full select-none"
							style={{ transformOrigin: `${panPos.x}% ${panPos.y}%` }}
							animate={{ scale: zoom ? 1.8 : 1 }}
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

						{/* Sibling of the zooming layer, so the pill never scales. */}
						<ArtworkStatusBadge isAvailable={isAvailable} isSold={isSold} />

						{/* Hint pills sit on the fixed-dark scrim: text-bg dark:text-ink (system 2.1). */}
						<div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-scrim/80 px-2.5 py-1 text-micro uppercase tracking-meta text-bg dark:text-ink [@media(hover:hover)_and_(pointer:fine)]:inline-flex">
							<ZoomIn size={11} aria-hidden="true" />
							<span>Hover to zoom</span>
						</div>

						{hasSiblings ? (
							<div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-scrim/80 px-2.5 py-1 text-micro uppercase tracking-meta text-bg dark:text-ink sm:hidden">
								<ArrowLeft size={9} aria-hidden="true" />
								Swipe
								<ArrowRight size={9} aria-hidden="true" />
							</div>
						) : null}
					</figure>
				</div>

				<LightboxSidebar
					artwork={artwork}
					position={position}
					total={total}
					whatsappLink={whatsappLink}
					ctaLabel={cta.label}
				/>
			</motion.div>
		</ViewerDialog>
	);
}

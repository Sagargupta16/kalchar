"use client";

import { ZoomIn } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import type { CSSProperties } from "react";
import { isPositivePrice, mostSaturatedSwatch } from "@/lib/catalog";
import { DUR, EASE_IN, EASE_OUT, SPRING_ZOOM } from "@/lib/motion";
import type { Artwork } from "@/lib/types";
import { ArtImage } from "./art-image";
import { ArtworkStatusBadge } from "./artwork-status-badge";
import type { useLightboxGestures } from "./lightbox-gestures";

/** Shared by the plate and its neighbour preloads. */
export const LIGHTBOX_IMAGE_SIZES =
	"(min-width: 1024px) 800px, (min-width: 768px) 55vw, calc(100vw - 64px)";

interface ArtworkViewerPlateProps {
	artwork: Artwork;
	direction: number;
	gestures: ReturnType<typeof useLightboxGestures>;
	onDrag: (event: unknown, info: PanInfo) => void;
	onDragEnd: (event: unknown, info: PanInfo) => void;
	onDirectionLock: (axis: "x" | "y") => void;
}

// Travel follows the plate's width, so paging reads as a slide on phones and desktops.
const slideVariants = {
	enter: (direction: number) => ({ x: `${direction * 16}%`, opacity: 0, scale: 0.98 }),
	center: {
		x: "0%",
		opacity: 1,
		scale: 1,
		transition: { duration: DUR.base, ease: EASE_OUT },
	},
	exit: (direction: number) => ({
		x: `${direction * -16}%`,
		opacity: 0,
		scale: 0.98,
		transition: { duration: DUR.fast, ease: EASE_IN },
	}),
};

export function ArtworkViewerPlate({
	artwork,
	direction,
	gestures,
	onDrag,
	onDragEnd,
	onDirectionLock,
}: Readonly<ArtworkViewerPlateProps>) {
	const {
		coarse,
		level,
		zoomed,
		zoomOrigin,
		pan,
		figureRef,
		handleTap,
		handlePointerDown,
		handlePointerMove,
		releasePointer,
		handleMouseMove,
		handleMouseEnter,
		handleMouseLeave,
	} = gestures;
	const glow = mostSaturatedSwatch(artwork.palette);

	return (
		<div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
			<AnimatePresence mode="popLayout" custom={direction} initial={false}>
				<motion.div
					key={artwork.slug}
					ref={figureRef}
					custom={direction}
					variants={slideVariants}
					initial="enter"
					animate="center"
					exit="exit"
					drag={coarse && !zoomed}
					dragDirectionLock
					onDirectionLock={onDirectionLock}
					dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
					dragElastic={0.2}
					onDrag={coarse && !zoomed ? onDrag : undefined}
					onDragEnd={coarse && !zoomed ? onDragEnd : undefined}
					onTap={handleTap}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={releasePointer}
					onPointerCancel={releasePointer}
					data-zoom={zoomed ? "" : undefined}
					style={{ "--plate-ratio": artwork.aspectRatio, touchAction: "none" } as CSSProperties}
					className="relative aspect-(--plate-ratio) w-[min(100%,calc(var(--plate-max)*var(--plate-ratio)))] max-h-(--plate-max) [--plate-max:min(60dvh,100cqh)] md:[--plate-max:min(80dvh,100cqh)]"
				>
					{glow ? (
						<motion.div
							aria-hidden="true"
							initial={{ opacity: 0 }}
							animate={{ opacity: zoomed ? 0.25 : 1 }}
							transition={{ duration: DUR.slow, ease: EASE_OUT }}
							style={{ "--plate-glow": glow } as CSSProperties}
							className="pointer-events-none absolute inset-0 rounded-md shadow-glow"
						/>
					) : null}
					<figure
						className="absolute inset-0 m-0 cursor-zoom-in"
						onMouseMove={handleMouseMove}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
					>
						<div className="relative h-full w-full overflow-hidden rounded-md bg-canvas shadow-e2">
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
							<ArtworkStatusBadge
								isAvailable={isPositivePrice(artwork.priceInr)}
								isSold={artwork.status === "sold"}
							/>
							<div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-scrim-deep px-3 py-1 text-micro text-bg dark:text-ink [@media(hover:hover)_and_(pointer:fine)]:inline-flex">
								<ZoomIn size={11} aria-hidden="true" />
								<span>Hover to zoom</span>
							</div>
						</div>
					</figure>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

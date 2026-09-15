"use client";

import { AnimatePresence, motion } from "motion/react";
import type { RefObject } from "react";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import type { useViewerDrag } from "@/components/gallery/use-viewer-drag";
import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";

/** Shared by the displayed photo and neighbour preloads at every viewport. */
export const EVENT_LIGHTBOX_IMAGE_SIZES =
	"(min-width: 1088px) 1024px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)";

const SLIDE_PX = 24;
const PAGE_VARIANTS = {
	enter: (direction: number) => ({ x: SLIDE_PX * direction, opacity: 0 }),
	center: { x: 0, opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
	exit: (direction: number) => ({
		x: -SLIDE_PX * direction,
		opacity: 0,
		transition: { duration: DUR.fast, ease: EASE_IN },
	}),
};

interface EventLightboxPhotoProps {
	keyBase: string;
	index: number;
	title: string;
	total: number;
	direction: 1 | -1;
	coarse: boolean;
	figureRef: RefObject<HTMLDivElement | null>;
	dragHandlers: ReturnType<typeof useViewerDrag>;
}

export function EventLightboxPhoto({
	keyBase,
	index,
	title,
	total,
	direction,
	coarse,
	figureRef,
	dragHandlers,
}: Readonly<EventLightboxPhotoProps>) {
	return (
		<AnimatePresence mode="popLayout" custom={direction} initial={false}>
			<motion.div
				key={index}
				ref={figureRef}
				custom={direction}
				variants={PAGE_VARIANTS}
				initial="enter"
				animate="center"
				exit="exit"
				drag={coarse}
				dragDirectionLock
				onDirectionLock={dragHandlers.onDirectionLock}
				dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
				dragElastic={0.2}
				onDrag={coarse ? dragHandlers.onDrag : undefined}
				onDragEnd={coarse ? dragHandlers.onDragEnd : undefined}
				className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md"
			>
				<ResponsiveImage
					keyBase={keyBase}
					alt={`${title}, photo ${index + 1} of ${total}`}
					sizes={EVENT_LIGHTBOX_IMAGE_SIZES}
					priority
					className="max-h-[70dvh] w-auto max-w-full select-none rounded-(--radius-lg) bg-canvas object-contain shadow-hairline md:max-h-[78dvh]"
				/>
			</motion.div>
		</AnimatePresence>
	);
}

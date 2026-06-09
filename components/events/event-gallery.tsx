"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { cn } from "@/lib/utils";

/**
 * Inline photo arrangement for one event, with an image-only lightbox.
 *
 * Up to MAX_INLINE photos show directly; when there are more, the last tile
 * carries a "+N more" overlay opening the lightbox at that point. The lightbox
 * cycles through ALL of the event's photos (keyboard + swipe).
 *
 * Layout (mobile-first), so each count reads as an intentional arrangement
 * rather than a ragged grid:
 *   1 photo  -> a single wide cover
 *   2 photos -> two equal tiles
 *   3+       -> a wide cover hero, then the rest in a row that fills the width
 *               (remaining count drives the column count, so no empty cells)
 */
const MAX_INLINE = 5;
/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 50;

interface EventGalleryProps {
	images: string[];
	title: string;
}

export function EventGallery({ images, title }: Readonly<EventGalleryProps>) {
	const [lightboxAt, setLightboxAt] = useState<number | null>(null);

	if (images.length === 0) return null;

	const open = (i: number) => setLightboxAt(i);
	const lightbox = (
		<EventLightbox
			images={images}
			title={title}
			index={lightboxAt}
			onClose={() => setLightboxAt(null)}
			onIndex={setLightboxAt}
		/>
	);

	// 1 or 2 photos: a simple equal arrangement, no hero.
	if (images.length <= 2) {
		return (
			<>
				<ul className={cn("grid gap-2", images.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
					{images.map((keyBase, i) => (
						<li key={keyBase}>
							<PhotoTile
								keyBase={keyBase}
								title={title}
								index={i}
								aspect={images.length === 1 ? "aspect-3/2" : "aspect-4/3"}
								priority={i === 0}
								onClick={() => open(i)}
							/>
						</li>
					))}
				</ul>
				{lightbox}
			</>
		);
	}

	// 3+ photos: a wide cover hero, then the remaining tiles in a width-filling row.
	const inline = images.slice(0, MAX_INLINE);
	const [cover, ...rest] = inline;
	const overflow = images.length - MAX_INLINE;

	return (
		<>
			<div className="space-y-2">
				<PhotoTile
					keyBase={cover ?? ""}
					title={title}
					index={0}
					aspect="aspect-16/9"
					priority
					onClick={() => open(0)}
				/>
				<ul className={cn("grid gap-2", restColumnsClass(rest.length))}>
					{rest.map((keyBase, idx) => {
						const i = idx + 1;
						const isLast = idx === rest.length - 1;
						const showOverflow = overflow > 0 && isLast;
						return (
							<li key={keyBase}>
								<PhotoTile
									keyBase={keyBase}
									title={title}
									index={i}
									aspect="aspect-square"
									overflow={showOverflow ? overflow : undefined}
									totalForLabel={showOverflow ? images.length : undefined}
									onClick={() => open(i)}
								/>
							</li>
						);
					})}
				</ul>
			</div>
			{lightbox}
		</>
	);
}

/** Columns for the non-cover row, sized so the tiles always fill the width. */
function restColumnsClass(count: number): string {
	if (count <= 2) return "grid-cols-2";
	if (count === 3) return "grid-cols-3";
	return "grid-cols-2 sm:grid-cols-4";
}

interface PhotoTileProps {
	keyBase: string;
	title: string;
	index: number;
	aspect: string;
	priority?: boolean;
	/** When set, render a "+N" overlay (the overflow entry). */
	overflow?: number;
	/** Total photo count, for the overflow tile's aria-label. */
	totalForLabel?: number;
	onClick: () => void;
}

function PhotoTile({
	keyBase,
	title,
	index,
	aspect,
	priority = false,
	overflow,
	totalForLabel,
	onClick,
}: Readonly<PhotoTileProps>) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={
				overflow !== undefined && totalForLabel !== undefined
					? `View all ${totalForLabel} photos from ${title}`
					: `View photo ${index + 1} from ${title}`
			}
			className={cn(
				"group relative block w-full overflow-hidden rounded-(--radius-md) bg-bg-soft ring-1 ring-black/8 transition-all duration-(--duration-base) ease-(--ease-out) hover:shadow-lg hover:ring-(--section-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:ring-white/8",
				aspect,
			)}
		>
			<ResponsiveImage
				keyBase={keyBase}
				alt={`${title}, photo ${index + 1}`}
				sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
				priority={priority}
				className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.03]"
			/>
			{overflow !== undefined ? (
				<span className="absolute inset-0 grid place-items-center bg-black/55 text-bg backdrop-blur-[1px] transition-colors duration-(--duration-base) group-hover:bg-black/65">
					<span className="t-display text-2xl sm:text-3xl">+{overflow}</span>
				</span>
			) : null}
		</button>
	);
}

interface EventLightboxProps {
	images: string[];
	title: string;
	index: number | null;
	onClose: () => void;
	onIndex: (i: number) => void;
}

function EventLightbox({ images, title, index, onClose, onIndex }: Readonly<EventLightboxProps>) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);
	const isOpen = index !== null;

	const go = useCallback(
		(dir: 1 | -1) => {
			if (index === null) return;
			onIndex((index + dir + images.length) % images.length);
		},
		[index, images.length, onIndex],
	);

	useEffect(() => {
		if (!isOpen) return;
		triggerRef.current = document.activeElement as HTMLElement | null;
		dialogRef.current?.focus();
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
			triggerRef.current?.focus?.();
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			else if (e.key === "ArrowRight") go(1);
			else if (e.key === "ArrowLeft") go(-1);
		};
		globalThis.addEventListener("keydown", onKey);
		return () => globalThis.removeEventListener("keydown", onKey);
	}, [isOpen, onClose, go]);

	const touchStartX = useRef(0);
	const onTouchStart = useCallback((e: React.TouchEvent) => {
		const t = e.touches[0];
		if (t) touchStartX.current = t.clientX;
	}, []);
	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const t = e.changedTouches[0];
			if (!t) return;
			const dx = t.clientX - touchStartX.current;
			if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx > 0 ? -1 : 1);
		},
		[go],
	);

	const hasMany = images.length > 1;

	return (
		<AnimatePresence>
			{isOpen && index !== null ? (
				<motion.div
					ref={dialogRef}
					role="dialog"
					aria-modal="true"
					aria-label={`${title} photos`}
					tabIndex={-1}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-md focus:outline-none md:p-8"
				>
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="absolute inset-0 cursor-zoom-out"
					/>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="absolute right-4 top-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bg-soft text-ink shadow-sm transition-colors duration-(--duration-fast) hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
					>
						<X size={18} />
					</button>

					<motion.figure
						initial={{ opacity: 0, scale: 0.96, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 12 }}
						transition={{ type: "spring", damping: 28, stiffness: 340 }}
						onTouchStart={onTouchStart}
						onTouchEnd={onTouchEnd}
						className="relative z-10 m-0 flex max-h-[85vh] w-full max-w-4xl flex-col"
					>
						<div className="relative aspect-4/3 max-h-[78vh] overflow-hidden rounded-(--radius-lg) border border-line bg-bg-soft shadow-2xl">
							<ResponsiveImage
								keyBase={images[index] ?? ""}
								alt={`${title}, photo ${index + 1} of ${images.length}`}
								sizes="(min-width: 768px) 80vw, 100vw"
								priority
								className="absolute inset-0 h-full w-full object-contain"
							/>
							{hasMany ? (
								<>
									<LightboxNav direction="prev" onClick={() => go(-1)} />
									<LightboxNav direction="next" onClick={() => go(1)} />
								</>
							) : null}
						</div>
						<figcaption className="mt-3 flex items-center justify-between text-xs text-muted">
							<span className="t-meta normal-case tracking-normal">{title}</span>
							{hasMany ? (
								<span className="tabular-nums">
									{index + 1} / {images.length}
								</span>
							) : null}
						</figcaption>
					</motion.figure>
				</motion.div>
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
		<button
			type="button"
			onClick={onClick}
			aria-label={isPrev ? "Previous photo" : "Next photo"}
			className={cn(
				"absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line/40 bg-bg/80 text-ink shadow-md backdrop-blur transition-colors duration-(--duration-fast) hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent",
				isPrev ? "left-3" : "right-3",
			)}
		>
			{isPrev ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
		</button>
	);
}

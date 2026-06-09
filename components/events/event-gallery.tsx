"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { cn } from "@/lib/utils";

/**
 * Inline photo grid for one event, with an image-only lightbox.
 *
 * Shows up to MAX_INLINE photos directly. When there are more, the last visible
 * tile becomes a "+N more" entry that opens the lightbox at that point. The
 * lightbox cycles through ALL of the event's photos (keyboard + swipe).
 *
 * Layout is mobile-first: the cover spans the full width, the rest tile beneath
 * it. Fewer photos degrade gracefully (1 photo = just the cover).
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

	const inline = images.slice(0, MAX_INLINE);
	const overflow = images.length - MAX_INLINE;

	return (
		<>
			<ul className={cn("grid gap-2", gridClass(inline.length))}>
				{inline.map((keyBase, i) => {
					const isCover = i === 0;
					const showOverflow = overflow > 0 && i === MAX_INLINE - 1;
					return (
						<li key={keyBase} className={cn(isCover && coverSpanClass(inline.length))}>
							<button
								type="button"
								onClick={() => setLightboxAt(i)}
								aria-label={
									showOverflow
										? `View all ${images.length} photos from ${title}`
										: `View photo ${i + 1} from ${title}`
								}
								className="group relative block aspect-4/3 w-full overflow-hidden rounded-(--radius-md) bg-bg-soft ring-1 ring-black/8 transition-all duration-(--duration-base) ease-(--ease-out) hover:shadow-lg hover:ring-(--section-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:ring-white/8"
							>
								<ResponsiveImage
									keyBase={keyBase}
									alt={`${title}, photo ${i + 1}`}
									sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
									priority={isCover}
									className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.03]"
								/>
								{showOverflow ? (
									<span className="absolute inset-0 grid place-items-center bg-black/55 text-bg backdrop-blur-[1px] transition-colors duration-(--duration-base) group-hover:bg-black/65">
										<span className="t-display text-2xl sm:text-3xl">+{overflow}</span>
									</span>
								) : null}
							</button>
						</li>
					);
				})}
			</ul>

			<EventLightbox
				images={images}
				title={title}
				index={lightboxAt}
				onClose={() => setLightboxAt(null)}
				onIndex={setLightboxAt}
			/>
		</>
	);
}

/** Grid column count for the inline tiles, by visible count. */
function gridClass(count: number): string {
	if (count <= 1) return "grid-cols-1";
	if (count === 2) return "grid-cols-2";
	// 3-5 photos: 2 columns on phones, 3 from sm up.
	return "grid-cols-2 sm:grid-cols-3";
}

/** The cover tile spans wider when there are enough siblings to balance it. */
function coverSpanClass(count: number): string {
	if (count <= 1) return "";
	if (count === 2) return "";
	// With 3+ tiles, let the cover span both/all columns for a hero feel.
	return "col-span-2 sm:col-span-3";
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

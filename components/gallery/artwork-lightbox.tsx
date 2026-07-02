"use client";

import {
	ArrowLeft,
	ArrowRight,
	Calendar,
	ImageIcon,
	MessageCircle,
	Ruler,
	X,
	ZoomIn,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { siteConfig } from "@/lib/site-config";
import { formatInr } from "@/lib/utils";
import { buildWhatsAppLink, buyArtworkMessage } from "@/lib/whatsapp";
import { Chromacard } from "./chromacard";
import { useLightbox } from "./lightbox-context";
import { ShareButton } from "./share-button";

/** Minimum horizontal travel (px) before a touch counts as a swipe. */
const SWIPE_THRESHOLD_PX = 50;

function deriveSlug(image: string): string {
	const file = image.split("/").pop() ?? "";
	return file.replace(/\.[^.]+$/, "");
}

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
	const dialogRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

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
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeLightbox();
			else if (e.key === "ArrowRight") nextArtwork();
			else if (e.key === "ArrowLeft") prevArtwork();
			else if (e.key === "Tab" && dialogRef.current) {
				const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
				);
				if (focusable.length === 0) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		};
		globalThis.addEventListener("keydown", handleKeyDown);
		return () => globalThis.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, closeLightbox, nextArtwork, prevArtwork]);

	// Warm the immediate neighbours' AVIF once the current piece settles, so
	// arrow/swipe to the next plate is near-instant. One each side only, and
	// skipped under Save-Data (metered connections) to not spend bytes a user
	// asked us to conserve.
	useEffect(() => {
		if (!isOpen || !activeArtwork || artworksList.length < 2) return;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		if (saveData) return;
		const i = artworksList.findIndex((a) => a.slug === activeArtwork.slug);
		if (i === -1) return;
		const neighbours = [
			artworksList[(i + 1) % artworksList.length],
			artworksList[(i - 1 + artworksList.length) % artworksList.length],
		];
		for (const n of neighbours) {
			if (!n) continue;
			const img = new Image();
			img.src = `${ARTWORK_IMAGE_BASE}/${deriveSlug(n.image)}-1600.avif`;
		}
	}, [isOpen, activeArtwork, artworksList]);

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
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		const touch = e.touches[0];
		if (touch) touchStartX.current = touch.clientX;
	}, []);
	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const touch = e.changedTouches[0];
			if (!touch) return;
			const dx = touch.clientX - touchStartX.current;
			if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
				if (dx > 0) prevArtwork();
				else nextArtwork();
				setZoom(false);
			}
		},
		[nextArtwork, prevArtwork],
	);

	return (
		<AnimatePresence>
			{isOpen && activeArtwork ? (
				<LightboxContent
					key="lightbox"
					artwork={activeArtwork}
					slug={deriveSlug(activeArtwork.image)}
					hasSiblings={artworksList.length > 1}
					whatsappPhone={whatsappPhone}
					zoom={zoom}
					panPos={panPos}
					dialogRef={dialogRef}
					imageRef={imageRef}
					onClose={closeLightbox}
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
	slug: string;
	hasSiblings: boolean;
	whatsappPhone: string;
	zoom: boolean;
	panPos: { x: number; y: number };
	dialogRef: React.RefObject<HTMLDivElement | null>;
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
	slug,
	hasSiblings,
	whatsappPhone,
	zoom,
	panPos,
	dialogRef,
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
	const whatsappLink = buildWhatsAppLink({
		phoneE164NoPlus: whatsappPhone,
		message: buyArtworkMessage(artwork),
	});

	const [srcFailed, setSrcFailed] = useState(false);
	const [failedSlug, setFailedSlug] = useState<string | null>(null);
	if (srcFailed && failedSlug !== slug) {
		setSrcFailed(false);
	}

	return (
		<motion.div
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby="lightbox-title"
			tabIndex={-1}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-md focus:outline-none md:p-8"
		>
			<button
				type="button"
				aria-label="Close lightbox"
				onClick={onClose}
				className="absolute inset-0 cursor-zoom-out"
			/>

			{/* Close button */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute right-4 top-4 z-[110] flex h-11 w-11 items-center justify-center rounded-full bg-bg-soft text-ink border border-line shadow-e2 transition-colors duration-(--duration-fast) hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
			>
				<X size={18} />
			</button>

			{/* Main container */}
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: 12 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.96, y: 12 }}
				transition={{ type: "spring", damping: 28, stiffness: 340 }}
				className="relative z-10 grid h-full w-full max-w-5xl overflow-hidden rounded-(--radius-lg) border border-line bg-bg shadow-e5 md:grid-cols-12"
			>
				{/* Image panel */}
				<div
					className="relative flex flex-1 items-center justify-center bg-bg-soft p-4 md:col-span-8 md:p-6"
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
				>
					{hasSiblings ? (
						<>
							<NavButton direction="prev" onClick={onPrev} />
							<NavButton direction="next" onClick={onNext} />
						</>
					) : null}

					<figure
						ref={imageRef}
						onMouseMove={onMouseMove}
						onMouseEnter={onZoomEnter}
						onMouseLeave={onZoomLeave}
						className="relative aspect-3/4 max-h-[80svh] overflow-hidden rounded-(--radius-md) shadow-hairline cursor-zoom-in m-0"
					>
						<picture>
							{srcFailed ? null : (
								<>
									<source type="image/avif" srcSet={`${ARTWORK_IMAGE_BASE}/${slug}-1600.avif`} />
									<source type="image/webp" srcSet={`${ARTWORK_IMAGE_BASE}/${slug}-1600.webp`} />
								</>
							)}
							<motion.img
								src={`${ARTWORK_IMAGE_BASE}/${slug}.jpg`}
								alt={artwork.description ?? artwork.title}
								onError={() => {
									setSrcFailed(true);
									setFailedSlug(slug);
								}}
								className="h-full w-full object-cover select-none"
								style={{ transformOrigin: `${panPos.x}% ${panPos.y}%` }}
								animate={{ scale: zoom ? 1.8 : 1 }}
								transition={{ type: "spring", stiffness: 200, damping: 25 }}
							/>
						</picture>

						<div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[0.55rem] uppercase tracking-[var(--tracking-meta)] text-white backdrop-blur-sm opacity-60">
							<ZoomIn size={11} aria-hidden="true" />
							<span className="hidden sm:inline">Hover to zoom</span>
						</div>

						{/* Mobile swipe hint */}
						{hasSiblings ? (
							<div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[0.55rem] uppercase tracking-[var(--tracking-meta)] text-white backdrop-blur-sm opacity-60 sm:hidden">
								<ArrowLeft size={9} />
								Swipe
								<ArrowRight size={9} />
							</div>
						) : null}
					</figure>
				</div>

				{/* Metadata sidebar */}
				<div className="flex flex-col justify-between border-t border-line bg-bg p-5 md:col-span-4 md:border-l md:border-t-0 md:p-6">
					<div>
						<span className="t-eyebrow text-accent">{artwork.style}</span>
						<h2 id="lightbox-title" className="t-display mt-2 text-2xl md:text-3xl">
							{artwork.title}
						</h2>

						{artwork.description ? (
							<p className="mt-3 text-sm leading-relaxed text-muted">{artwork.description}</p>
						) : null}

						<dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
							<MetaRow icon={<ImageIcon size={13} />} label="Medium" value={artwork.medium} />
							{artwork.year ? (
								<MetaRow icon={<Calendar size={13} />} label="Year" value={String(artwork.year)} />
							) : null}
							{artwork.dimensions ? (
								<MetaRow icon={<Ruler size={13} />} label="Size" value={artwork.dimensions} />
							) : null}
							{typeof artwork.priceInr === "number" ? (
								<div className="flex items-baseline justify-between border-t border-line/50 pt-3">
									<dt className="t-meta normal-case tracking-normal">Price</dt>
									<dd className="text-lg font-semibold tabular-nums text-accent">
										{formatInr(artwork.priceInr)}
									</dd>
								</div>
							) : null}
						</dl>

						{artwork.palette && artwork.palette.length > 0 ? (
							<div className="mt-5 border-t border-line/50 pt-4">
								<p className="t-meta text-xs">Color palette</p>
								<Chromacard
									palette={artwork.palette}
									ariaLabel={`Palette for ${artwork.title}`}
									className="mt-2 h-3"
								/>
							</div>
						) : null}
					</div>

					{/* CTA + share */}
					<div className="mt-6 space-y-2.5">
						<a
							href={whatsappLink}
							target="_blank"
							rel="noopener noreferrer"
							className="flex w-full items-center justify-center gap-2 rounded-(--radius-sm) bg-accent px-4 py-3 text-xs uppercase tracking-[var(--tracking-meta)] font-medium text-bg shadow-e2 transition-colors duration-(--duration-fast) hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
						>
							<MessageCircle size={16} />
							Enquire on WhatsApp
						</a>
						{/* Shareable deep link: opens THIS piece's modal for whoever receives it. */}
						<ShareButton
							title={`${artwork.title} by Megha Seth`}
							url={`${siteConfig.url}/work?piece=${artwork.slug}`}
							className="w-full justify-center"
						/>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

function MetaRow({
	icon,
	label,
	value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
	return (
		<div className="flex justify-between">
			<dt className="t-meta normal-case tracking-normal flex items-center gap-1.5">
				<span className="text-muted">{icon}</span> {label}
			</dt>
			<dd className="text-ink font-medium">{value}</dd>
		</div>
	);
}

function NavButton({
	direction,
	onClick,
}: Readonly<{ direction: "prev" | "next"; onClick: () => void }>) {
	const isPrev = direction === "prev";
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={isPrev ? "Previous artwork" : "Next artwork"}
			className={`absolute ${isPrev ? "left-3" : "right-3"} z-20 flex h-11 w-11 items-center justify-center rounded-full bg-bg/80 text-ink border border-line/40 shadow-e2 backdrop-blur transition-colors duration-(--duration-fast) hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent`}
		>
			{isPrev ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
		</button>
	);
}

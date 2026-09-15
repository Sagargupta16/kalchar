"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { Artwork } from "@/lib/types";

/** Viewport-percentage point of the tap that opened the lightbox; the panel
 *  grows from here via transform-origin (motion addendum G4). */
export interface LightboxOrigin {
	xPct: number;
	yPct: number;
}

interface LightboxContextType {
	isOpen: boolean;
	activeArtwork: Artwork | null;
	artworksList: readonly Artwork[];
	/** WhatsApp phone (E.164, no `+`) for the enquiry CTA. Supplied server-side. */
	whatsappPhone: string;
	/** Where the opening tap landed, or null (keyboard, deep link): centre origin. */
	origin: LightboxOrigin | null;
	openLightbox: (artwork: Artwork, list?: readonly Artwork[], origin?: LightboxOrigin) => void;
	closeLightbox: () => void;
	nextArtwork: () => void;
	prevArtwork: () => void;
}

const LightboxContext = createContext<LightboxContextType | undefined>(undefined);

/**
 * `whatsappPhone` is read once on the server (from the data seam) and passed
 * in, so the client-side lightbox never reaches through the data seam itself.
 */
export function LightboxProvider({
	children,
	whatsappPhone,
}: Readonly<{
	children: React.ReactNode;
	whatsappPhone: string;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeArtwork, setActiveArtwork] = useState<Artwork | null>(null);
	const [artworksList, setArtworksList] = useState<readonly Artwork[]>([]);
	const [origin, setOrigin] = useState<LightboxOrigin | null>(null);

	// Mirror the latest active piece + list in a ref so the navigation callbacks
	// can read current state without listing it as a dependency. That keeps the
	// callbacks' identities stable across renders, so the lightbox's keydown /
	// focus effects don't tear down and rebuild on every navigation (which would
	// thrash keyboard focus). Pure-read updaters keep this StrictMode-safe.
	const activeRef = useRef<Artwork | null>(null);
	const listRef = useRef<readonly Artwork[]>([]);
	activeRef.current = activeArtwork;
	listRef.current = artworksList;

	const openLightbox = useCallback(
		(artwork: Artwork, list: readonly Artwork[] = [], tapOrigin?: LightboxOrigin) => {
			setActiveArtwork(artwork);
			setArtworksList(list.length > 0 ? list : [artwork]);
			setOrigin(tapOrigin ?? null);
			setIsOpen(true);
		},
		[],
	);

	const closeLightbox = useCallback(() => {
		setIsOpen(false);
		setActiveArtwork(null);
	}, []);

	// Paging loops only with 3+ items (visual-direction 2.4); with 2 the ends clamp.
	const step = useCallback((dir: 1 | -1) => {
		const list = listRef.current;
		const current = activeRef.current;
		if (list.length <= 1 || !current) return;
		const i = list.findIndex((a) => a.slug === current.slug);
		if (i === -1) return;
		const raw = i + dir;
		let targetIndex: number;
		if (list.length >= 3) {
			targetIndex = (raw + list.length) % list.length;
		} else if (raw < 0 || raw >= list.length) {
			return;
		} else {
			targetIndex = raw;
		}
		const target = list[targetIndex];
		if (target) setActiveArtwork(target);
	}, []);

	const nextArtwork = useCallback(() => step(1), [step]);
	const prevArtwork = useCallback(() => step(-1), [step]);

	const value = useMemo(
		() => ({
			isOpen,
			activeArtwork,
			artworksList,
			whatsappPhone,
			origin,
			openLightbox,
			closeLightbox,
			nextArtwork,
			prevArtwork,
		}),
		[
			isOpen,
			activeArtwork,
			artworksList,
			whatsappPhone,
			origin,
			openLightbox,
			closeLightbox,
			nextArtwork,
			prevArtwork,
		],
	);

	return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

export function useLightbox() {
	const context = useContext(LightboxContext);
	if (!context) {
		throw new Error("useLightbox must be used within a LightboxProvider");
	}
	return context;
}

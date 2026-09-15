"use client";

import { Palette, ShoppingBag } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { EAGER_CARD_COUNT, GalleryGrid } from "@/components/gallery/gallery-grid";
import { GallerySearch } from "@/components/gallery/gallery-search";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isForSale } from "@/lib/catalog";
import {
	DUR,
	EASE_IN,
	gridStaggerDelay,
	REVEAL_DISTANCE,
	SPRING_INDICATOR,
	SPRING_LAYOUT,
} from "@/lib/motion";
import type { ArtStyle, Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Style filter + responsive gallery grid.
 *
 * Server passes the full sorted catalog as props; the Client island handles
 * the filter pill state and renders the visible subset. Filtering is local
 * (no re-fetch) so toggling between styles is instant.
 *
 * Style and availability are independent so visitors can browse, for example,
 * available Pichwai pieces without losing their search.
 *
 * The rail stays within reach on phones. Position-only layout animation
 * moves cards between columns without stretching the artwork.
 */
interface WorkFilterProps {
	styles: readonly ArtStyle[];
	items: readonly Artwork[];
}

const ALL = "All" as const;
const AVAILABLE = "Available to buy" as const;
type Filter = ArtStyle;

/** One pill recipe for both axes; state colours are appended per pill. The
 *  isolate keeps the sliding ink span's -z-10 inside the pill instead of
 *  behind the rail's backdrop. */
const PILL =
	"relative isolate inline-flex min-h-control shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition-ui pressable";

/**
 * Resolve the style from `?style=<name>` (case-insensitive, validated against the
 * real style list so a junk param falls back to All), else All. Keeping the
 * filter in the URL makes a filtered gallery a shareable link and lets the
 * "Explore this style" chips on the detail page deep-link straight to it.
 */
function filterFromParams(params: URLSearchParams, styles: readonly ArtStyle[]): Filter {
	const style = params.get("style");
	if (style) {
		const match = styles.find((s) => s.toLowerCase() === style.toLowerCase());
		if (match) return match;
	}
	return ALL;
}

export function WorkFilter({ styles, items }: Readonly<WorkFilterProps>) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const queryParam = searchParams.get("q") ?? "";
	const [query, setQuery] = useState(queryParam);
	const searchRef = useRef<HTMLInputElement>(null);
	const allFilterRef = useRef<HTMLButtonElement>(null);
	const resultsId = useId();
	const active = filterFromParams(new URLSearchParams(searchParams.toString()), styles);
	const availableOnly = searchParams.get("view") === "available";

	// Keep typing synchronous, while Back/Forward and reload restore the URL's search.
	// Read the live URL so a delayed navigation snapshot cannot overwrite newer typing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: queryParam signals URL search changes
	useEffect(() => {
		setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
	}, [queryParam]);

	const replaceParams = useCallback(
		(params: URLSearchParams) => {
			const qs = params.toString();
			window.history.replaceState(
				null,
				"",
				`${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
			);
		},
		[pathname],
	);
	const changeQuery = (next: string) => {
		setQuery(next);
		const params = new URLSearchParams(window.location.search);
		if (next) params.set("q", next);
		else params.delete("q");
		replaceParams(params);
	};
	const clearSearch = () => {
		changeQuery("");
		searchRef.current?.focus({ preventScroll: true });
	};
	const clearFilters = () => {
		const params = new URLSearchParams(window.location.search);
		params.delete("style");
		params.delete("view");
		params.delete("q");
		setQuery("");
		replaceParams(params);
		allFilterRef.current?.focus({ preventScroll: true });
	};

	// Write the chosen filter to the URL (replace, no scroll jump) so it's the
	// single source of truth and the view is shareable/back-button friendly.
	const setActive = useCallback(
		(next: Filter) => {
			const params = new URLSearchParams(window.location.search);
			if (next !== ALL) params.set("style", next);
			else params.delete("style");
			replaceParams(params);
		},
		[replaceParams],
	);

	const toggleAvailability = () => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("view") === "available") params.delete("view");
		else params.set("view", "available");
		replaceParams(params);
	};

	const forSaleCount = useMemo(() => items.filter(isForSale).length, [items]);
	const matchingItems = useMemo(() => {
		const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
		return items.filter((item) => {
			const text = `${item.title} ${item.style} ${item.medium}`.toLocaleLowerCase();
			return terms.every((term) => text.includes(term)) && (!availableOnly || isForSale(item));
		});
	}, [items, query, availableOnly]);
	/** Each count is the result of selecting that style with the current search and availability. */
	const styleCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of matchingItems) {
			counts.set(item.style, (counts.get(item.style) ?? 0) + 1);
		}
		return counts;
	}, [matchingItems]);
	/** Catalogue positions stay stable under every filter. */
	const indexBySlug = useMemo(() => new Map(items.map((item, i) => [item.slug, i + 1])), [items]);

	const visible = useMemo(
		() => matchingItems.filter((item) => active === ALL || item.style === active),
		[active, matchingItems],
	);

	// Keep each initial card's wrapper stable. Switching a bare card to a
	// Reveal after mount replaces its link when the viewer opens, disconnecting
	// the element that should receive focus when the viewer closes.
	const eagerArtworkSlugs = useRef(
		new Set(visible.slice(0, EAGER_CARD_COUNT).map((art) => art.slug)),
	);

	// Deep link: bring the active pill into the rail's visible box (scrolls the
	// rail only, never the page, so ?style=Gond from a detail page lands at y=0).
	const railRef = useRef<HTMLFieldSetElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-run whenever the active pill changes
	useEffect(() => {
		const rail = railRef.current;
		if (!rail || rail.scrollWidth <= rail.clientWidth) return;
		const activePill = rail.querySelector<HTMLElement>("[data-active]");
		if (!activePill) return;
		rail.scrollTo({
			left: Math.max(0, activePill.offsetLeft - rail.offsetLeft - 16),
			behavior: "auto",
		});
	}, [active]);

	// --- Shareable deep-link <-> lightbox binding ---
	// `?piece=<slug>` opens that artwork's modal on load, so a shared link lands
	// the recipient straight on the piece. The first open PUSHES a history entry
	// so the browser back button closes the modal (Android WebViews have no
	// CloseWatcher); moving between pieces replaces; closing pops our entry.
	const { isOpen, activeArtwork, openLightbox, closeLightbox } = useLightbox();
	const pieceParam = searchParams.get("piece");
	const openedFromUrl = useRef<string | null>(null);
	const pushedRef = useRef(false);
	/** True once the address bar has caught up with the open piece. */
	const urlSynced = useRef(false);
	/** Slug whose open from the URL has been requested but not yet rendered. */
	const pendingOpen = useRef<string | null>(null);

	// Open from the URL once per distinct ?piece= value (guard against re-opening
	// after the user closes the modal on the same param).
	useEffect(() => {
		if (!pieceParam || openedFromUrl.current === pieceParam) return;
		const match = items.find((i) => i.slug === pieceParam);
		if (!match) return;
		openedFromUrl.current = pieceParam;
		pendingOpen.current = pieceParam;
		openLightbox(match, visible.some((item) => item.slug === match.slug) ? visible : [match]);
	}, [pieceParam, items, visible, openLightbox]);

	// Lightbox state <-> URL. Open: push once, then replace while navigating.
	// The URL losing ?piece= while we are open means the back button fired, so
	// close. Closed: pop the entry we pushed, or replace when the visitor arrived
	// on ?piece= directly and there is nothing of ours to pop.
	// biome-ignore lint/correctness/useExhaustiveDependencies: searchParams triggers Back/Forward reconciliation; read the current URL to avoid stale navigation snapshots
	useEffect(() => {
		// This is local viewer state. Native history integrates with Next's
		// search params without a server navigation that can replace the trigger
		// while the dialog is opening or restoring keyboard focus.
		const params = new URLSearchParams(window.location.search);
		const urlPiece = params.get("piece");
		if (isOpen && activeArtwork) {
			pendingOpen.current = null;
			if (urlPiece === activeArtwork.slug) {
				urlSynced.current = true;
				return;
			}
			if (!urlPiece && urlSynced.current) {
				urlSynced.current = false;
				pushedRef.current = false;
				openedFromUrl.current = null;
				closeLightbox();
				return;
			}
			const hadPiece = urlPiece !== null;
			params.set("piece", activeArtwork.slug);
			openedFromUrl.current = activeArtwork.slug;
			const url = `${pathname}?${params.toString()}`;
			if (hadPiece || pushedRef.current) {
				window.history.replaceState(null, "", url);
			} else {
				pushedRef.current = true;
				window.history.pushState(null, "", url);
			}
			return;
		}
		// An open from this ?piece= is in flight (the open-from-URL effect fired in
		// this same commit, e.g. browser Forward after Back): leave the URL alone or
		// the replace() below would close the lightbox the moment it opens.
		if (urlPiece && pendingOpen.current === urlPiece) return;
		urlSynced.current = false;
		if (!urlPiece) return;
		openedFromUrl.current = null;
		if (pushedRef.current) {
			pushedRef.current = false;
			window.history.back();
			return;
		}
		params.delete("piece");
		const qs = params.toString();
		window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
	}, [isOpen, activeArtwork, searchParams, pathname, closeLightbox]);

	const styleFilters: Filter[] = [ALL, ...styles];

	const pieceWord = visible.length === 1 ? "piece" : "pieces";
	let statusMessage: string;
	if (query.trim()) {
		statusMessage = `${visible.length} ${pieceWord} matching "${query.trim()}"`;
	} else if (availableOnly) {
		statusMessage = `Showing ${visible.length} ${active === ALL ? "" : `${active} `}${pieceWord} available to buy`;
	} else if (active === ALL) {
		statusMessage = `Showing all ${visible.length} pieces`;
	} else {
		statusMessage = `Showing ${visible.length} ${active} ${pieceWord}`;
	}

	const exitTransition = { duration: DUR.fast, ease: EASE_IN } as const;
	const cardExit = { opacity: 0, scale: 0.96, transition: exitTransition };

	return (
		<>
			<h2 className="sr-only">Gallery</h2>
			<div className="mb-5 flex flex-wrap items-end gap-3 sm:gap-6">
				<GallerySearch
					query={query}
					onQuery={changeQuery}
					inputRef={searchRef}
					resultsId={resultsId}
				/>
				{forSaleCount > 0 || availableOnly ? (
					<button
						type="button"
						onClick={toggleAvailability}
						aria-pressed={availableOnly}
						className={cn(
							PILL,
							availableOnly
								? "border-ink bg-ink text-bg"
								: "border-line text-muted hover:border-accent hover:text-accent-text",
						)}
					>
						<ShoppingBag size={16} aria-hidden="true" />
						{AVAILABLE}
					</button>
				) : null}
			</div>
			{/* Single-row horizontal rail on phones (a half-cut last pill is the swipe
			    cue), sticky under the shrunk header with a glass fill until lg, where
			    it sits static and transparent (visual-direction 2.2). */}
			<fieldset
				ref={railRef}
				className="z-sticky m-0 -mx-(--container-px) sticky top-(--header-h-shrunk) flex min-w-0 snap-x items-center gap-2 overflow-x-auto border-0 bg-bg/90 px-(--container-px) py-3 backdrop-blur-(--glass-blur) backdrop-saturate-(--glass-saturate) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible lg:static lg:mx-0 lg:bg-transparent lg:p-0"
			>
				<legend className="sr-only">Filter artwork</legend>
				<LayoutGroup>
					{styleFilters.map((f) => {
						const isActive = f === active;
						const count = f === ALL ? matchingItems.length : (styleCounts.get(f) ?? 0);
						return (
							<button
								key={f}
								ref={f === ALL ? allFilterRef : undefined}
								type="button"
								onClick={() => setActive(f)}
								aria-pressed={isActive}
								data-active={isActive || undefined}
								className={cn(
									PILL,
									isActive
										? "border-ink text-bg"
										: "border-line text-muted hover:border-accent hover:text-accent-text",
								)}
							>
								{isActive ? (
									<motion.span
										aria-hidden="true"
										layoutId="work-filter-pill"
										transition={SPRING_INDICATOR}
										className="absolute inset-0 -z-10 rounded-full bg-ink"
									/>
								) : null}
								{f}
								<span
									className={cn("text-xs tabular-nums", isActive ? "text-bg/70" : "text-muted")}
								>
									{count}
								</span>
							</button>
						);
					})}
				</LayoutGroup>
			</fieldset>

			<p id={resultsId} className="mt-5 text-sm text-muted" aria-live="polite" aria-atomic="true">
				{statusMessage}
			</p>

			{visible.length > 0 ? (
				<GalleryGrid className="mt-5">
					<AnimatePresence mode="popLayout" initial={false}>
						{visible.map((art, i) => {
							const eager = eagerArtworkSlugs.current.has(art.slug);
							const card = (
								<ArtworkCard
									artwork={art}
									siblings={visible}
									priority={i < 3}
									index={indexBySlug.get(art.slug)}
									total={items.length}
									unveilDelayMs={eager ? gridStaggerDelay(i) : undefined}
								/>
							);
							return (
								<motion.li
									key={art.slug}
									layout="position"
									className="min-w-0 [&>div]:h-full"
									transition={SPRING_LAYOUT}
									exit={cardExit}
								>
									{eager ? (
										card
									) : (
										<Reveal
											eager={false}
											distance={REVEAL_DISTANCE.item}
											delayMs={gridStaggerDelay(i)}
										>
											{card}
										</Reveal>
									)}
								</motion.li>
							);
						})}
					</AnimatePresence>
				</GalleryGrid>
			) : (
				<EmptyState
					className="mt-(--space-block)"
					icon={<Palette size={24} aria-hidden="true" />}
					title={
						items.length === 0
							? "No artwork to show"
							: query.trim()
								? "No pieces found"
								: availableOnly
									? "No available pieces in this selection"
									: "Nothing in this style yet"
					}
					body={
						items.length === 0
							? "There are no pieces in the collection right now."
							: query.trim()
								? "Try a different title or medium, or clear the filters to explore the whole collection."
								: availableOnly
									? "Try another style, or explore the full collection."
									: "Try another tradition, or see every piece."
					}
					action={
						items.length > 0 ? (
							<button
								type="button"
								onClick={query.trim() ? clearSearch : clearFilters}
								className={buttonVariants({ variant: "secondary" })}
							>
								{query.trim() ? "Clear search" : "Show all pieces"}
							</button>
						) : undefined
					}
				/>
			)}
		</>
	);
}

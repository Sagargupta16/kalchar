"use client";

import { Palette, ShoppingBag } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import {
	EAGER_CARD_COUNT,
	GALLERY_LEAD_SIZES,
	GalleryGrid,
} from "@/components/gallery/gallery-grid";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isForSale } from "@/lib/catalog";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
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
 * The pill row carries two axes in one single-select: the style chips (All +
 * each tradition) plus a distinct "Available to buy" chip that narrows to
 * for-sale pieces (priced and not yet sold). Sold pieces show under All with
 * their badge, and drop out the moment "Available to buy" is active.
 *
 * Visual pass (visual-direction 2.2): pills are wall text (t-meta) with the
 * active state carried by a sliding ink pill (layoutId, SPRING_INDICATOR) and
 * per-pill counts in tabular numerals; the rail sticks under the header on
 * phones; the grid reflows through AnimatePresence popLayout (G3) with
 * layout="position" so the 3:4 plates never stretch.
 */
interface WorkFilterProps {
	styles: readonly ArtStyle[];
	items: readonly Artwork[];
}

const ALL = "All" as const;
const AVAILABLE = "Available to buy" as const;
// A filter is either a style name or one of the two reserved sentinels. Since
// ArtStyle is `string`, the sentinels would be absorbed into the union, so the
// type is just `string` and the ALL/AVAILABLE consts carry the intent.
type Filter = ArtStyle;

/** One pill recipe for both axes; state colours are appended per pill. The
 *  isolate keeps the sliding ink span's -z-10 inside the pill instead of
 *  behind the rail's backdrop. */
const PILL =
	"t-meta relative isolate inline-flex min-h-control shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 transition-ui pressable";

/**
 * Resolve the active filter from the URL: `?view=available` -> the buy lens,
 * `?style=<name>` -> that tradition (case-insensitive, validated against the
 * real style list so a junk param falls back to All), else All. Keeping the
 * filter in the URL makes a filtered gallery a shareable link and lets the
 * "Explore this style" chips on the detail page deep-link straight to it.
 */
function filterFromParams(params: URLSearchParams, styles: readonly ArtStyle[]): Filter {
	if (params.get("view") === "available") return AVAILABLE;
	const style = params.get("style");
	if (style) {
		const match = styles.find((s) => s.toLowerCase() === style.toLowerCase());
		if (match) return match;
	}
	return ALL;
}

export function WorkFilter({ styles, items }: Readonly<WorkFilterProps>) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const reduceMotion = usePrefersReducedMotion();
	const active = filterFromParams(new URLSearchParams(searchParams.toString()), styles);

	// Write the chosen filter to the URL (replace, no scroll jump) so it's the
	// single source of truth and the view is shareable/back-button friendly.
	const setActive = useCallback(
		(next: Filter) => {
			const params = new URLSearchParams();
			if (next === AVAILABLE) params.set("view", "available");
			else if (next !== ALL) params.set("style", next);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[router, pathname],
	);

	const forSaleCount = useMemo(() => items.filter(isForSale).length, [items]);
	/** Count per style pill, derived from the catalog the client already holds. */
	const styleCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of items) counts.set(item.style, (counts.get(item.style) ?? 0) + 1);
		return counts;
	}, [items]);
	/** 1-based catalogue position per piece: the wall-label "No. NN" is the
	 *  piece's place in catalog sort order, stable under every filter. */
	const indexBySlug = useMemo(() => new Map(items.map((item, i) => [item.slug, i + 1])), [items]);

	const visible = useMemo(() => {
		if (active === ALL) return items;
		if (active === AVAILABLE) return items.filter(isForSale);
		return items.filter((i) => i.style === active);
	}, [active, items]);

	// The eager plate unveils run only on the first paint; every reflow after a
	// filter tap enters through the Motion whileInView path instead.
	const initialRender = useRef(true);
	useEffect(() => {
		initialRender.current = false;
	}, []);

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
		openLightbox(match, items);
	}, [pieceParam, items, openLightbox]);

	// Lightbox state <-> URL. Open: push once, then replace while navigating.
	// The URL losing ?piece= while we are open means the back button fired, so
	// close. Closed: pop the entry we pushed, or replace when the visitor arrived
	// on ?piece= directly and there is nothing of ours to pop.
	useEffect(() => {
		const params = new URLSearchParams(searchParams.toString());
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
				router.replace(url, { scroll: false });
			} else {
				pushedRef.current = true;
				router.push(url, { scroll: false });
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
			router.back();
			return;
		}
		params.delete("piece");
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [isOpen, activeArtwork, searchParams, router, pathname, closeLightbox]);

	const styleFilters: Filter[] = [ALL, ...styles];

	const pieceWord = visible.length === 1 ? "piece" : "pieces";
	let statusMessage: string;
	if (active === ALL) {
		statusMessage = `Showing all ${visible.length} pieces`;
	} else if (active === AVAILABLE) {
		statusMessage = `Showing ${visible.length} ${pieceWord} available to buy`;
	} else {
		statusMessage = `Showing ${visible.length} ${active} ${pieceWord}`;
	}

	const exitTransition = { duration: DUR.fast, ease: EASE_IN } as const;
	const cardExit = reduceMotion
		? { opacity: 0, transition: exitTransition }
		: { opacity: 0, scale: 0.96, transition: exitTransition };

	return (
		<>
			<h2 className="sr-only">Gallery</h2>
			{/* Single-row horizontal rail on phones (a half-cut last pill is the swipe
			    cue), sticky under the shrunk header with a glass fill until lg, where
			    it sits static and transparent (visual-direction 2.2). */}
			<fieldset
				ref={railRef}
				className="z-sticky m-0 -mx-(--container-px) sticky top-(--header-h-shrunk) flex min-w-0 snap-x items-center gap-2 overflow-x-auto border-0 border-b border-line bg-bg/90 px-(--container-px) py-3 backdrop-blur-(--glass-blur) backdrop-saturate-(--glass-saturate) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0"
			>
				<legend className="sr-only">Filter artwork</legend>
				<LayoutGroup>
					{styleFilters.map((f) => {
						const isActive = f === active;
						const count = f === ALL ? items.length : (styleCounts.get(f) ?? 0);
						return (
							<button
								key={f}
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
								<span className={cn("tabular-nums", isActive ? "text-bg/70" : "text-muted")}>
									({count})
								</span>
							</button>
						);
					})}

					{/* "Available to buy" -- a second axis on the same ink recipe, set
					    apart by its icon and the gold hairline border. Hidden entirely
					    when nothing is for sale, so the row never offers an empty filter. */}
					{forSaleCount > 0 ? (
						<>
							<span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line sm:block" />
							<button
								type="button"
								onClick={() => setActive(AVAILABLE)}
								aria-pressed={active === AVAILABLE}
								data-active={active === AVAILABLE || undefined}
								className={cn(
									PILL,
									active === AVAILABLE
										? "border-ink text-bg"
										: "border-(--color-gold-hairline) text-muted hover:text-accent-text",
								)}
							>
								{active === AVAILABLE ? (
									<motion.span
										aria-hidden="true"
										layoutId="work-filter-pill"
										transition={SPRING_INDICATOR}
										className="absolute inset-0 -z-10 rounded-full bg-ink"
									/>
								) : null}
								<ShoppingBag size={13} aria-hidden="true" />
								{AVAILABLE}
								<span
									className={cn("tabular-nums", active === AVAILABLE ? "text-bg/70" : "text-muted")}
								>
									({forSaleCount})
								</span>
							</button>
						</>
					) : null}
				</LayoutGroup>
			</fieldset>

			<p className="t-meta mt-4" aria-live="polite" aria-atomic="true">
				{statusMessage}
			</p>

			{visible.length > 0 ? (
				<GalleryGrid spanLead className="mt-(--space-block)">
					<AnimatePresence mode="popLayout" initial={false}>
						{visible.map((art, i) => {
							const eager = initialRender.current && i < EAGER_CARD_COUNT;
							const card = (
								<ArtworkCard
									artwork={art}
									siblings={visible}
									priority={i < 3}
									index={indexBySlug.get(art.slug)}
									total={items.length}
									sizes={i % 7 === 0 ? GALLERY_LEAD_SIZES : undefined}
									unveilDelayMs={eager ? gridStaggerDelay(i) : undefined}
									unveilSlow={i === 0}
									float={i === 0}
								/>
							);
							return (
								<motion.li
									key={art.slug}
									layout="position"
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
					title={active === AVAILABLE ? "Nothing for sale right now" : "Nothing in this style yet"}
					body={
						active === AVAILABLE
							? "Every piece has found a home. Ask us about a commission any time."
							: "Try another tradition, or see every piece."
					}
					action={
						<button
							type="button"
							onClick={() => setActive(ALL)}
							className={buttonVariants({ variant: "secondary" })}
						>
							Show all pieces
						</button>
					}
				/>
			)}
		</>
	);
}

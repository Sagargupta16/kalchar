"use client";

import { Palette, ShoppingBag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ArtworkCard } from "@/components/gallery/artwork-card";
import { EAGER_CARD_COUNT, GalleryGrid } from "@/components/gallery/gallery-grid";
import { useLightbox } from "@/components/gallery/lightbox-context";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { isForSale } from "@/lib/catalog";
import { staggerDelay } from "@/lib/motion";
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
 * Cards are uniform 3:4 plates -- the user picked uniform-cropped over
 * masonry to avoid the previous attempt's size inconsistency.
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

/** One pill recipe for both axes; state colours are appended per pill. */
const PILL =
	"inline-flex min-h-control shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 py-2 text-xs uppercase tracking-meta transition-ui pressable";

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

	const visible = useMemo(() => {
		if (active === ALL) return items;
		if (active === AVAILABLE) return items.filter(isForSale);
		return items.filter((i) => i.style === active);
	}, [active, items]);

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

	return (
		<>
			<h2 className="sr-only">Gallery</h2>
			{/* Single-row horizontal rail on phones (a half-cut last pill is the swipe
			    cue), wrapping from sm. py-1.5 -my-1.5 gives the pill focus outline
			    (2px at a 3px offset on rounded-full) room inside the clipping scroller
			    without moving the rhythm. */}
			<fieldset
				ref={railRef}
				className="m-0 -mx-(--container-px) -my-1.5 flex min-w-0 snap-x items-center gap-2 overflow-x-auto border-0 px-(--container-px) py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:my-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:py-0"
			>
				<legend className="sr-only">Filter artwork</legend>
				{styleFilters.map((f) => {
					const isActive = f === active;
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
									? "border-ink bg-ink text-bg"
									: "border-line text-muted hover:border-accent hover:text-accent-text",
							)}
						>
							{f}
						</button>
					);
				})}

				{/* "Available to buy" -- a second axis, vermillion-accented so it reads
				    as its own thing rather than another tradition. Hidden entirely when
				    nothing is for sale, so the row never offers an empty filter. */}
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
									? "border-(--color-vermillion) bg-(--color-vermillion) text-bg"
									: "border-(--color-vermillion)/50 text-(--color-vermillion) hover:bg-(--color-vermillion)/10",
							)}
						>
							<ShoppingBag size={13} aria-hidden="true" />
							{AVAILABLE}
							<span className="tabular-nums opacity-80">{forSaleCount}</span>
						</button>
					</>
				) : null}
			</fieldset>

			<p className="t-meta mt-4" aria-live="polite" aria-atomic="true">
				{statusMessage}
			</p>

			{visible.length > 0 ? (
				<GalleryGrid className="mt-(--space-block)">
					{visible.map((art, i) => (
						<Reveal key={art.slug} as="li" eager={i < EAGER_CARD_COUNT} delayMs={staggerDelay(i)}>
							<ArtworkCard artwork={art} siblings={visible} priority={i < 3} />
						</Reveal>
					))}
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

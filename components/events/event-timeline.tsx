"use client";

import { CalendarDays, Pin } from "lucide-react";
import { motion, useScroll } from "motion/react";
import { type CSSProperties, type RefObject, useEffect, useRef } from "react";
import { KineticText } from "@/components/motion/kinetic-text";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventGallery } from "./event-gallery";
import { wallDateParts } from "./wall-date";
import "@/components/editorial/editorial.css";

/**
 * The events chronology. A spine runs the full height (left edge on phones,
 * between the date and record columns from lg); a pigment fill grows down it
 * with scroll progress (scaleY on the compositor), and each record's node
 * pops as the record scrolls in. Records carry the wall date (sticky from
 * lg, the first entry of each year hangs its year as a watermark), badges,
 * a kinetic title, the description and the photo mosaic.
 */
export function EventTimeline({ events }: Readonly<{ events: readonly Event[] }>) {
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
	const firstGalleryIndex = events.findIndex((event) => event.images.length > 0);
	useHashAnchor(ref);

	return (
		<div ref={ref} className="relative">
			<div
				aria-hidden="true"
				data-timeline
				className="absolute inset-y-0 left-[0.4375rem] w-px bg-(--color-gold-hairline) lg:left-[11.25rem]"
			>
				<motion.div
					className="timeline-fill absolute inset-0 bg-(--section-accent)"
					style={{ scaleY: scrollYProgress }}
				/>
			</div>
			{events.map((event, i) => {
				const year = wallDateParts(event.eventDate)?.year;
				const previousYear =
					i > 0 ? wallDateParts(events[i - 1]?.eventDate ?? "")?.year : undefined;
				return (
					<EventRecord
						key={event.id}
						event={event}
						first={i === 0}
						watermark={year !== undefined && year !== previousYear}
						leadGallery={i === firstGalleryIndex}
					/>
				);
			})}
		</div>
	);
}

/** How long a deep link keeps re-anchoring while photos above it decode. */
const ANCHOR_HOLD_MS = 4000;

/**
 * Deep links (/events#<id>, from the home cards) land on their record even
 * though the photos above it only learn their true ratio as they decode and
 * grow the page: while the timeline resizes during the first few seconds the
 * record is scrolled back to the top. Any reader input ends the hold.
 */
function useHashAnchor(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const host = ref.current;
		const id = decodeURIComponent(globalThis.location.hash.slice(1));
		const target = id ? document.getElementById(id) : null;
		if (!host || !target || !host.contains(target)) return;
		const observer = new ResizeObserver(() => target.scrollIntoView({ block: "start" }));
		const release = () => observer.disconnect();
		observer.observe(host);
		const timer = setTimeout(release, ANCHOR_HOLD_MS);
		const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
		for (const intent of intents) {
			globalThis.addEventListener(intent, release, { once: true, passive: true });
		}
		return () => {
			release();
			clearTimeout(timer);
			for (const intent of intents) globalThis.removeEventListener(intent, release);
		};
	}, [ref]);
}

interface EventRecordProps {
	event: Event;
	first: boolean;
	watermark: boolean;
	leadGallery: boolean;
}

function EventRecord({ event, first, watermark, leadGallery }: Readonly<EventRecordProps>) {
	const [ref, state] = useViewReveal<HTMLElement>();
	const hasBadges = Boolean(event.category || event.featured);
	return (
		// The wrapper carries the anchor so home cards can deep-link to /events#<id>.
		<div id={event.id} className="scroll-mt-(--space-page)">
			<article
				ref={ref}
				data-reveal={state}
				className={cn(
					"relative grid gap-4 pb-(--space-canyon) pl-9 lg:grid-cols-[10rem_1fr] lg:gap-x-14 lg:pl-0",
					first ? "pt-0" : "pt-2",
				)}
			>
				<span
					aria-hidden="true"
					className="timeline-node absolute top-2 left-0 size-3.5 rounded-full bg-(--section-accent) ring-4 ring-bg lg:left-[calc(11.25rem-0.4375rem+0.5px)]"
				/>
				<WallDate iso={event.eventDate} watermark={watermark} />
				<div className="min-w-0">
					{hasBadges ? (
						<div className="rise flex flex-wrap items-center gap-x-3 gap-y-1">
							{event.category ? <Badge>{event.category}</Badge> : null}
							{event.featured ? (
								<Badge variant="accent-soft">
									<Pin size={12} aria-hidden="true" />
									Featured
								</Badge>
							) : null}
						</div>
					) : null}
					<h2 className={cn("t-headline type-section", hasBadges && "mt-3")}>
						<KineticText text={event.title} />
					</h2>
					{event.description ? (
						<p
							className="rise t-body mt-3 max-w-(--measure-essay)"
							style={{ "--i": 2 } as CSSProperties}
						>
							{event.description}
						</p>
					) : null}
					{event.images.length > 0 ? (
						<div className="mt-6">
							<EventGallery images={event.images} title={event.title} lead={leadGallery} />
						</div>
					) : null}
				</div>
			</article>
		</div>
	);
}

/**
 * The wall date: the day numeral in the headline voice beside the stacked
 * month and year. From lg it sticks in the date column while the record
 * scrolls past, with the year hung behind it as a display watermark on the
 * first record of each year.
 */
function WallDate({ iso, watermark }: Readonly<{ iso: string; watermark: boolean }>) {
	const date = wallDateParts(iso);
	if (!date) return null;
	return (
		<div className="relative isolate lg:sticky lg:top-[calc(var(--header-h-shrunk)+var(--space-page))] lg:self-start">
			{watermark ? (
				// Drawn as SVG text: an ornament at 20% ink is not body copy, and
				// keeping it out of the text layer keeps it out of contrast audits.
				<svg
					aria-hidden="true"
					focusable="false"
					data-year-watermark
					viewBox="0 0 160 64"
					className="t-headline pointer-events-none absolute bottom-full left-0 -z-10 -mb-2 hidden h-16 w-40 select-none text-(--section-accent) opacity-20 lg:block"
				>
					<text x="0" y="56" fill="currentColor" fontSize="64" className="lining-nums">
						{date.year}
					</text>
				</svg>
			) : null}
			<time
				dateTime={iso}
				className="rise flex items-baseline gap-3 lg:flex-col lg:items-start lg:gap-2"
			>
				<span className="t-headline text-h2 lining-nums text-(--section-accent) lg:text-h1">
					{date.day}
				</span>
				<span className="t-meta flex items-center gap-1.5">
					<CalendarDays size={12} aria-hidden="true" />
					{date.month} {date.year}
				</span>
			</time>
		</div>
	);
}

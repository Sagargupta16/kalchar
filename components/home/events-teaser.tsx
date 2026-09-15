import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Home preview of recent events. The grid adapts to how many events there are
 * so it never leaves a lopsided gap: 1 = a centred 3:2 banner capped at 48rem,
 * 2 = two columns, 3 = three; covers stay `object-contain` so a portrait phone
 * photo is never cropped.
 */
function layoutForCount(count: number): {
	gridCols: string;
	itemClass: string;
	coverAspect: string;
	coverSizes: string;
} {
	if (count === 1) {
		return {
			gridCols: "",
			itemClass: "mx-auto w-full sm:max-w-3xl",
			coverAspect: "aspect-4/3 sm:aspect-3/2",
			coverSizes: "(min-width: 768px) 48rem, 100vw",
		};
	}
	return {
		gridCols: count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
		itemClass: "",
		coverAspect: "aspect-4/3",
		coverSizes: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
	};
}

/** Wall-date parts (visual-direction 2.1 change 6): bare day numeral + short month/year. */
function wallDateParts(iso: string): { day: string; monthYear: string } | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return {
		day: String(d.getDate()),
		monthYear: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
	};
}

export function EventsTeaser({
	events,
	eyebrow,
	title,
	lead,
}: Readonly<{ events: readonly Event[]; eyebrow: string; title: string; lead?: string }>) {
	const { gridCols, itemClass, coverAspect, coverSizes } = layoutForCount(events.length);

	return (
		<Section id="events" accent="peacock" padded rhythm="grand">
			<Spread
				header={
					<Reveal>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
					</Reveal>
				}
			>
				<ul className={cn("grid gap-(--grid-gap)", gridCols)}>
					{events.map((event, i) => {
						const date = wallDateParts(event.eventDate);
						return (
							<Reveal key={event.id} as="li" delayMs={staggerDelay(i)} className={itemClass}>
								<Link
									href={`/events#${event.id}`}
									className="group pressable block rounded-(--radius-md)"
									aria-label={`${event.title}, ${event.images.length} photo${event.images.length === 1 ? "" : "s"}`}
								>
									<PlateFrame className={coverAspect}>
										{event.images[0] ? (
											<ResponsiveImage
												keyBase={event.images[0]}
												alt={`${event.title} cover`}
												sizes={coverSizes}
												className="absolute inset-0 h-full w-full object-contain"
											/>
										) : (
											<span className="absolute inset-0 grid place-items-center text-muted">
												<CalendarDays size={28} aria-hidden="true" />
											</span>
										)}
										{event.images.length > 1 ? (
											<Badge variant="overlay" className="absolute right-3 bottom-3 z-raised">
												{event.images.length} photos
											</Badge>
										) : null}
									</PlateFrame>
									<div className="mt-4">
										{date ? (
											<p className="flex items-center gap-2">
												<span className="t-numeral text-title text-(--section-accent)">
													{date.day}
												</span>
												<span className="t-meta inline-flex items-center gap-1.5">
													<CalendarDays size={12} aria-hidden="true" />
													{date.monthYear}
												</span>
											</p>
										) : null}
										<h3 className="t-display mt-1 text-h3 transition-colors group-hover:text-(--section-accent)">
											{event.title}
										</h3>
									</div>
								</Link>
							</Reveal>
						);
					})}
				</ul>

				<Reveal delayMs={staggerDelay(3)}>
					<div className="mt-(--space-block)">
						<SectionCta href="/events">See all events</SectionCta>
					</div>
				</Reveal>
			</Spread>
		</Section>
	);
}

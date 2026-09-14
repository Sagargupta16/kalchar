import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Event } from "@/lib/types";
import { cn, formatEventDate } from "@/lib/utils";

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

export function EventsTeaser({
	events,
	eyebrow,
	title,
	lead,
}: Readonly<{ events: readonly Event[]; eyebrow: string; title: string; lead?: string }>) {
	const { gridCols, itemClass, coverAspect, coverSizes } = layoutForCount(events.length);

	return (
		<Section id="events" accent="peacock" padded borderBottom>
			<Reveal>
				<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
			</Reveal>

			<ul className={cn("mt-(--space-block) grid gap-(--grid-gap)", gridCols)}>
				{events.map((event, i) => (
					<Reveal key={event.id} as="li" delayMs={staggerDelay(i)} className={itemClass}>
						<Link
							href={`/events#${event.id}`}
							className="group pressable block rounded-(--radius-md)"
							aria-label={`${event.title}, ${event.images.length} photo${event.images.length === 1 ? "" : "s"}`}
						>
							<div
								className={cn(
									"relative overflow-hidden rounded-(--radius-md) bg-canvas shadow-hairline transition-ui elevate-e2 group-hover:-translate-y-0.5 group-hover:ring-1 group-hover:ring-(--section-accent)",
									coverAspect,
								)}
							>
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
							</div>
							<div className="mt-3">
								{event.eventDate ? (
									<p className="t-meta inline-flex items-center gap-1.5 text-(--section-accent)">
										<CalendarDays size={12} aria-hidden="true" />
										{formatEventDate(event.eventDate)}
									</p>
								) : null}
								<h3 className="t-display mt-1 text-h3 transition-colors group-hover:text-(--section-accent)">
									{event.title}
								</h3>
							</div>
						</Link>
					</Reveal>
				))}
			</ul>

			<Reveal delayMs={staggerDelay(3)}>
				<div className="mt-(--space-block)">
					<SectionCta href="/events">See all events</SectionCta>
				</div>
			</Reveal>
		</Section>
	);
}

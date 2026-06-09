import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { SectionShell } from "@/components/home/section-shell";
import { Reveal } from "@/components/motion/reveal";
import type { Event } from "@/lib/types";
import { formatEventDate } from "@/lib/utils";

/** Reveal stagger: each card waits index * step, capped so later cards aren't slow. */
const STAGGER_STEP_MS = 60;

/**
 * Home preview of recent events: each card is the event cover linking to the
 * full /events page. Mirrors the SectionShell + "View more" pattern used by the
 * Selected Work and Workshops previews.
 */
export function EventsTeaser({
	events,
	eyebrow,
	title,
	lead,
}: Readonly<{ events: readonly Event[]; eyebrow: string; title: string; lead?: string }>) {
	return (
		<SectionShell
			eyebrow={eyebrow}
			title={title}
			lead={lead}
			href="/events"
			hrefLabel="See all events"
		>
			<ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
				{events.map((event, i) => (
					<Reveal key={event.id} as="li" delayMs={i * STAGGER_STEP_MS}>
						<Link
							href="/events"
							className="group block focus-visible:outline-none"
							aria-label={`${event.title}, ${event.images.length} photo${event.images.length === 1 ? "" : "s"}`}
						>
							<div className="relative aspect-4/3 overflow-hidden rounded-(--radius-md) bg-bg-soft ring-1 ring-black/8 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:shadow-xl group-hover:ring-(--section-accent) group-focus-visible:ring-2 group-focus-visible:ring-accent dark:ring-white/8">
								{event.images[0] ? (
									<ResponsiveImage
										keyBase={event.images[0]}
										alt={`${event.title} cover`}
										sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
										priority={i < 3}
										className="absolute inset-0 h-full w-full object-cover transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.03]"
									/>
								) : (
									<span className="absolute inset-0 grid place-items-center text-muted">
										<CalendarDays size={28} aria-hidden="true" />
									</span>
								)}
								{event.images.length > 1 ? (
									<span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-medium text-bg backdrop-blur-sm">
										{event.images.length} photos
									</span>
								) : null}
							</div>
							<div className="mt-3">
								{event.eventDate ? (
									<p className="t-meta inline-flex items-center gap-1.5 text-(--section-accent)">
										<CalendarDays size={12} aria-hidden="true" />
										{formatEventDate(event.eventDate)}
									</p>
								) : null}
								<h3 className="t-display mt-1 text-lg leading-tight transition-colors duration-(--duration-base) ease-(--ease-out) group-hover:text-(--section-accent) sm:text-xl">
									{event.title}
								</h3>
							</div>
						</Link>
					</Reveal>
				))}
			</ul>
		</SectionShell>
	);
}

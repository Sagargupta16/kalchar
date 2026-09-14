import { ArrowRight, CalendarDays, Pin } from "lucide-react";
import Link from "next/link";
import { EventGallery } from "@/components/events/event-gallery";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ClosingCta } from "@/components/ui/closing-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllEvents } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "Events",
	description:
		"Workshops held, exhibitions, classes, and community gatherings with Megha Seth and Kalchar.",
	path: "/events/",
});

const EVENT_DATE_LOCALE = "en-IN";

/** Split an ISO date into wall-date parts ("24", "Sep", "2026"); null when invalid. */
function wallDateParts(iso: string): { day: string; month: string; year: string } | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return {
		day: String(d.getDate()),
		month: d.toLocaleDateString(EVENT_DATE_LOCALE, { month: "short" }),
		year: String(d.getFullYear()),
	};
}

/**
 * The exhibition wall date (visual-direction 2.6): bare day numeral in the
 * numeral voice (30px at 390, 48px in the 1280 chronology column) beside the
 * stacked month/year meta with the kept calendar glyph. The first entry of
 * each year hangs its year as a display watermark behind the numeral.
 */
function WallDate({ iso, watermark }: Readonly<{ iso: string; watermark: boolean }>) {
	const date = wallDateParts(iso);
	if (!date) return null;
	return (
		<div className="relative isolate lg:sticky lg:top-[calc(var(--header-h-shrunk)+var(--space-page))] lg:self-start">
			{watermark ? (
				<span
					aria-hidden="true"
					data-year-watermark
					className="t-headline pointer-events-none absolute -top-8 -left-2 -z-10 hidden select-none text-display text-line lg:block"
				>
					{date.year}
				</span>
			) : null}
			<Reveal eager>
				<time
					dateTime={iso}
					className="flex items-baseline gap-3 lg:flex-col lg:items-start lg:gap-1"
				>
					<span className="t-numeral text-h2 text-(--section-accent) lg:text-h1">{date.day}</span>
					<span className="t-meta flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-1.5">
						<span className="inline-flex items-center gap-1.5">
							<CalendarDays size={12} aria-hidden="true" />
							{date.month}
						</span>
						<span>{date.year}</span>
					</span>
				</time>
			</Reveal>
		</div>
	);
}

export default async function EventsPage() {
	const events = await getAllEvents();

	return (
		<main>
			{/* The standard public page header (2.0): grand rhythm on the peacock
			    wash band, short kachni under the eyebrow. */}
			<Section accent="peacock" background="wash" rhythm="grand" padded>
				<PageHeader
					kachni
					eyebrow="Events"
					title="Workshops, exhibitions, and gatherings"
					lead="Moments from the louder room: hands-on sessions, shows, and the community that gathers around folk art."
				/>
			</Section>

			<Section accent="peacock" padded containerClassName="pt-(--space-block)">
				{events.length > 0 ? (
					<div className="relative">
						{events.map((event, i) => {
							const year = wallDateParts(event.eventDate)?.year;
							const previousYear =
								i > 0 ? wallDateParts(events[i - 1]?.eventDate ?? "")?.year : undefined;
							return (
								// The wrapper carries the anchor so home cards can deep-link to
								// /events#<id>, plus the entry seam; the Reveal stays the
								// <article> (e2e transform check).
								<div
									key={event.id}
									id={event.id}
									className="border-t border-(--color-gold-hairline) first:border-t-0"
								>
									<Reveal
										as="article"
										eager={i < 2}
										delayMs={staggerDelay(i)}
										className="grid gap-4 py-(--section-py) lg:grid-cols-[12rem_1fr] lg:gap-10"
									>
										<WallDate
											iso={event.eventDate}
											watermark={year !== undefined && year !== previousYear}
										/>
										<div className="min-w-0">
											<Reveal eager delayMs={staggerDelay(1)}>
												<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
													{event.category ? <Badge>{event.category}</Badge> : null}
													{event.featured ? (
														<Badge variant="accent-soft">
															<Pin size={12} aria-hidden="true" />
															Pinned
														</Badge>
													) : null}
												</div>
												<h2
													className={cn(
														"t-display text-title",
														(event.category || event.featured) && "mt-2",
													)}
												>
													{event.title}
												</h2>
											</Reveal>
											{event.description ? (
												<Reveal eager delayMs={staggerDelay(2)}>
													<p className="t-body mt-2 max-w-(--measure-essay)">{event.description}</p>
												</Reveal>
											) : null}
											<div className="mt-6">
												<EventGallery images={event.images} title={event.title} lead={i === 0} />
											</div>
										</div>
									</Reveal>
								</div>
							);
						})}
						{/* The exhibition timeline: one gold hairline running the full
						    height of the chronology, between the date and record columns
						    (12rem column + half the lg gap of 2.5rem). Rendered last so
						    the first entry wrapper stays :first-child for its border. */}
						<div
							aria-hidden="true"
							data-timeline
							className="absolute inset-y-0 left-[13.25rem] hidden w-px bg-(--color-gold-hairline) lg:block"
						/>
					</div>
				) : (
					<Reveal delayMs={staggerDelay(1)}>
						<EmptyState
							icon={<CalendarDays size={24} aria-hidden="true" />}
							title="No events posted yet"
							body="Workshops, exhibitions, and gatherings will appear here. Follow along on Instagram for the latest."
							action={
								<Link
									href="/workshops"
									className={cn(buttonVariants({ variant: "secondary" }), "group")}
								>
									See workshops
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-1"
									/>
								</Link>
							}
						/>
					</Reveal>
				)}

				{/* Closing CTA: events are the proof; point interested visitors to
				    the workshops they can actually book. Shown only when there are
				    events, so the empty state stays quiet. Internal link, no popup. */}
				{events.length > 0 ? (
					<Reveal delayMs={staggerDelay(2)}>
						<ClosingCta
							className="bg-canvas"
							title="Want a session like these?"
							body="We run hands-on workshops for groups, schools, and studios."
							action={
								<Link
									href="/workshops"
									className={cn(buttonVariants({ variant: "secondary" }), "group w-full sm:w-auto")}
								>
									See workshops
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-1"
									/>
								</Link>
							}
						/>
					</Reveal>
				) : null}
			</Section>
		</main>
	);
}

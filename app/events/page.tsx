import { ArrowRight, CalendarDays, Pin } from "lucide-react";
import Link from "next/link";
import { EventGallery } from "@/components/events/event-gallery";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllEvents } from "@/lib/data";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, formatEventDate } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "Events",
	description:
		"Workshops held, exhibitions, classes, and community gatherings with Megha Seth and Kalchar.",
	path: "/events/",
});

/** Reveal stagger: each event waits index * step, capped so later ones aren't slow. */
const STAGGER_STEP_MS = 80;
const STAGGER_MAX_INDEX = 4;

export default async function EventsPage() {
	const events = await getAllEvents();

	return (
		<main>
			<Section accent="peacock">
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow="Events"
						title="Workshops, exhibitions, and gatherings"
						lead="Moments from the louder room: hands-on sessions, shows, and the community that gathers around folk art."
					/>

					{events.length > 0 ? (
						<div className="mt-12 space-y-8 sm:mt-16 sm:space-y-10">
							{events.map((event, i) => (
								<Reveal
									key={event.id}
									as="article"
									eager={i === 0}
									delayMs={Math.min(i, STAGGER_MAX_INDEX) * STAGGER_STEP_MS}
									className="overflow-hidden rounded-(--radius-md) border border-line bg-bg-soft/40 p-5 sm:p-7"
								>
									<header className="mb-5 flex flex-col gap-1.5 sm:mb-6">
										<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
											{event.eventDate ? (
												<p className="t-meta inline-flex items-center gap-1.5 text-(--section-accent)">
													<CalendarDays size={13} aria-hidden="true" />
													{formatEventDate(event.eventDate)}
												</p>
											) : null}
											{event.category ? (
												<span className="rounded-full border border-line px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[var(--tracking-meta)] text-muted">
													{event.category}
												</span>
											) : null}
											{event.featured ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-(--section-accent)/12 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[var(--tracking-meta)] text-(--section-accent)">
													<Pin size={10} aria-hidden="true" />
													Pinned
												</span>
											) : null}
										</div>
										<h2 className="t-display text-2xl sm:text-3xl">{event.title}</h2>
										{event.description ? (
											<p className="t-body max-w-2xl text-muted">{event.description}</p>
										) : null}
									</header>

									<EventGallery images={event.images} title={event.title} />
								</Reveal>
							))}
						</div>
					) : (
						<Reveal delayMs={120}>
							<div className="mt-12 rounded-(--radius-md) border border-dashed border-line bg-bg-soft px-6 py-16 text-center">
								<CalendarDays
									size={28}
									aria-hidden="true"
									className="mx-auto text-(--section-accent)"
								/>
								<p className="t-display mt-4 text-xl">No events posted yet</p>
								<p className="mx-auto mt-2 max-w-md text-sm text-muted">
									Workshops, exhibitions, and gatherings will appear here. Follow along on Instagram
									for the latest.
								</p>
							</div>
						</Reveal>
					)}

					{/* Closing CTA: events are the proof; point interested visitors to
					    the workshops they can actually book. Shown only when there are
					    events, so the empty state stays quiet. Internal link, no popup. */}
					{events.length > 0 ? (
						<Reveal delayMs={120}>
							<div className="mt-12 flex flex-col items-start gap-3 rounded-(--radius-md) border border-line bg-bg-soft/40 p-6 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="t-display text-xl">Want a session like these?</p>
									<p className="mt-1 text-sm text-muted">
										We run hands-on workshops for groups, schools, and studios.
									</p>
								</div>
								<Link
									href="/workshops"
									className={cn(buttonVariants({ variant: "secondary" }), "group shrink-0")}
								>
									See workshops
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
									/>
								</Link>
							</div>
						</Reveal>
					) : null}
				</Container>
			</Section>
		</main>
	);
}

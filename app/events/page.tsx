import { ArrowRight, CalendarDays, Pin } from "lucide-react";
import Link from "next/link";
import { EventGallery } from "@/components/events/event-gallery";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import { ClosingCta } from "@/components/ui/closing-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllEvents } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, formatEventDate } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "Events",
	description:
		"Workshops held, exhibitions, classes, and community gatherings with Megha Seth and Kalchar.",
	path: "/events/",
});

export default async function EventsPage() {
	const events = await getAllEvents();

	return (
		<main>
			<Section accent="peacock" padded>
				<PageHeader
					eyebrow="Events"
					title="Workshops, exhibitions, and gatherings"
					lead="Moments from the louder room: hands-on sessions, shows, and the community that gathers around folk art."
				/>

				{events.length > 0 ? (
					<div className="mt-(--space-block) flex flex-col gap-(--grid-gap)">
						{events.map((event, i) => (
							// The wrapper carries the anchor so home cards can deep-link to
							// /events#<id>; the Reveal stays the <article> (e2e transform check).
							<div key={event.id} id={event.id}>
								<Reveal
									as="article"
									eager={i < 2}
									delayMs={staggerDelay(i)}
									className={cardVariants({ padding: "md" })}
								>
									<header className="mb-6 flex flex-col gap-2">
										<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
											{event.eventDate ? (
												<p className="t-meta inline-flex items-center gap-1.5 text-(--section-accent)">
													<CalendarDays size={13} aria-hidden="true" />
													{formatEventDate(event.eventDate)}
												</p>
											) : null}
											{event.category ? <Badge>{event.category}</Badge> : null}
											{event.featured ? (
												<Badge variant="accent-soft">
													<Pin size={12} aria-hidden="true" />
													Pinned
												</Badge>
											) : null}
										</div>
										<h2 className="t-display text-title">{event.title}</h2>
										{event.description ? (
											<p className="t-body max-w-(--header-max)">{event.description}</p>
										) : null}
									</header>

									<EventGallery images={event.images} title={event.title} />
								</Reveal>
							</div>
						))}
					</div>
				) : (
					<Reveal delayMs={staggerDelay(1)}>
						<EmptyState
							className="mt-(--space-block)"
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

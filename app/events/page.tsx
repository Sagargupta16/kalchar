import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Masthead, type MastheadStat } from "@/components/editorial/masthead";
import { EventTimeline } from "@/components/events/event-timeline";
import { wallDateParts } from "@/components/events/wall-date";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section, SectionHeader } from "@/components/ui/section";
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

function WorkshopsLink({ className }: Readonly<{ className?: string }>) {
	return (
		<Link
			href="/workshops"
			className={cn(buttonVariants({ variant: "primary", size: "lg" }), "group", className)}
		>
			See workshops
			<ArrowRight
				size={16}
				aria-hidden="true"
				className="transition-transform group-hover:translate-x-1"
			/>
		</Link>
	);
}

export default async function EventsPage() {
	const events = await getAllEvents();
	const photos = events.reduce((sum, event) => sum + event.images.length, 0);
	const years = events
		.map((event) => Number(wallDateParts(event.eventDate)?.year))
		.filter((year) => Number.isFinite(year));
	const stats: MastheadStat[] =
		events.length > 0
			? [
					{ value: events.length, label: events.length === 1 ? "Event" : "Events" },
					{ value: photos, label: photos === 1 ? "Photo" : "Photos" },
					...(years.length > 0
						? [
								{
									value: Math.min(...years),
									from: Math.min(...years) - 24,
									label: "Gathering since",
								},
							]
						: []),
				]
			: [];

	return (
		<main>
			<Masthead
				accent="peacock"
				glyph="उत्सव"
				eyebrow="Events"
				title="Workshops, exhibitions, and gatherings"
				lead="A look back at hands-on sessions, exhibitions, and the community that gathers around folk art."
				accentLast
				stats={stats}
				actions={
					<Link
						href="/workshops"
						className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "group")}
					>
						Find a workshop
						<ArrowRight
							size={16}
							aria-hidden="true"
							className="transition-transform group-hover:translate-x-1"
						/>
					</Link>
				}
			/>

			<Section accent="peacock" padded containerClassName="pt-(--space-canyon)">
				{events.length > 0 ? (
					<EventTimeline events={events} />
				) : (
					<Reveal delayMs={staggerDelay(1)}>
						<EmptyState
							icon={<CalendarDays size={24} aria-hidden="true" />}
							title="No events posted yet"
							body="Workshops, exhibitions, and gatherings will appear here. Explore our workshops to enquire about a session."
							action={<WorkshopsLink />}
						/>
					</Reveal>
				)}
			</Section>

			{/* Closing band: events are the proof; point interested visitors to the
			    workshops they can actually book. Shown only when there are events,
			    so the empty state stays quiet. */}
			{events.length > 0 ? (
				<Section accent="pichwai" background="pigment" padded>
					<div
						data-slot="closing-cta"
						className="grid gap-8 md:grid-cols-12 md:items-end md:gap-10"
					>
						<div className="md:col-span-8">
							<SectionHeader
								eyebrow="Book a session"
								title="Want a session like these?"
								lead="We run hands-on workshops for groups, schools, and studios."
							/>
						</div>
						<Reveal delayMs={staggerDelay(3)} className="md:col-span-4 md:text-right">
							<WorkshopsLink className="w-full sm:w-auto" />
						</Reveal>
					</div>
				</Section>
			) : null}
		</main>
	);
}

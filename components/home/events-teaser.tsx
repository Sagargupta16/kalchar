import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { Event } from "@/lib/types";
import { cn, formatEventDate } from "@/lib/utils";

/**
 * Home "quick look" at recent events: a horizontal scroll-snap strip where the
 * next card peeks in from the right, hinting there's more to swipe (mobile) or
 * scroll (desktop). Each card links to the full /events page; a "See all
 * events" button closes the section. Scroll-snap is native CSS, so it respects
 * reduced-motion automatically and adds no JS/animation ornament.
 */
export function EventsTeaser({
	events,
	eyebrow,
	title,
	lead,
}: Readonly<{ events: readonly Event[]; eyebrow: string; title: string; lead?: string }>) {
	return (
		<div className="border-b border-line py-(--section-py)">
			<Container>
				<div className="flex items-end justify-between gap-4">
					<header className="max-w-2xl">
						<Reveal>
							<p className="t-eyebrow flex items-center gap-2">
								<AccentRule />
								{eyebrow}
							</p>
						</Reveal>
						<Reveal
							delayMs={80}
							as="h2"
							className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl"
						>
							{title}
						</Reveal>
						{lead ? (
							<Reveal delayMs={140}>
								<p className="t-lead mt-4">{lead}</p>
							</Reveal>
						) : null}
					</header>

					{/* Desktop "see all" sits with the header; a full-width button repeats
					    below for thumb reach on mobile. */}
					<Reveal className="hidden shrink-0 sm:block">
						<Link
							href="/events"
							className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "group")}
						>
							See all events
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</Link>
					</Reveal>
				</div>
			</Container>

			{/* Edge-to-edge scroll strip. Container padding becomes scroll padding so
			    the first card aligns with the page gutter and the last can rest there
			    too; cards snap to the start. The narrow basis leaves the next card
			    peeking in. */}
			<Reveal className="mt-8 sm:mt-10">
				<ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-(--container-px) px-(--container-px) pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{events.map((event, i) => (
						<li
							key={event.id}
							className="w-[78%] max-w-sm shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
						>
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
											sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 78vw"
											priority={i < 2}
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
						</li>
					))}
				</ul>
			</Reveal>

			{/* Mobile full-width "see all". */}
			<Container className="sm:hidden">
				<Reveal className="mt-6">
					<Link
						href="/events"
						className={cn(buttonVariants({ variant: "secondary" }), "group w-full justify-center")}
					>
						See all events
						<ArrowRight
							size={14}
							aria-hidden="true"
							className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
						/>
					</Link>
				</Reveal>
			</Container>
		</div>
	);
}

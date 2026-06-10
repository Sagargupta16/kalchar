import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ResponsiveImage } from "@/components/gallery/responsive-image";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { Event } from "@/lib/types";
import { cn, formatEventDate } from "@/lib/utils";

/**
 * Home preview of recent events, mirroring the Workshops / Selected Work
 * sections: a SectionShell-style header + a responsive grid that fills the
 * container width and a "See all events" button.
 *
 * The grid adapts to how many events there are so it never leaves a lopsided
 * gap: 1 event = a full-width feature banner; 2 = two columns; 3 = three. The
 * cover aspect ratio follows suit (wide banner for 1, 4:3 tiles otherwise).
 */
/**
 * Grid + cover styling derived from how many events show, so the section fills
 * its width at any count: 1 = a wide feature banner, 2 = two columns, 3 = three.
 */
function layoutForCount(count: number): {
	gridCols: string;
	coverAspect: string;
	coverSizes: string;
} {
	if (count === 1) {
		return {
			gridCols: "",
			coverAspect: "aspect-16/9 sm:aspect-21/9",
			coverSizes: "(min-width: 768px) 100vw, 100vw",
		};
	}
	return {
		gridCols: count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
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
	const { gridCols, coverAspect, coverSizes } = layoutForCount(events.length);

	return (
		<Section accent="peacock" borderBottom>
			<Container className="py-(--section-py)">
				<header className="max-w-2xl">
					<Reveal>
						<p className="t-eyebrow flex items-center gap-2">
							<AccentRule />
							{eyebrow}
						</p>
					</Reveal>
					<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl">
						{title}
					</Reveal>
					{lead ? (
						<Reveal delayMs={140}>
							<p className="t-lead mt-4">{lead}</p>
						</Reveal>
					) : null}
				</header>

				<ul className={cn("mt-10 grid gap-5 sm:mt-14", gridCols)}>
					{events.map((event, i) => (
						<Reveal key={event.id} as="li" delayMs={i * 60}>
							<Link
								href="/events"
								className="group block focus-visible:outline-none"
								aria-label={`${event.title}, ${event.images.length} photo${event.images.length === 1 ? "" : "s"}`}
							>
								<div
									className={cn(
										"relative overflow-hidden rounded-(--radius-md) bg-bg-soft ring-1 ring-black/8 transition-all duration-(--duration-base) ease-(--ease-out) group-hover:shadow-xl group-hover:ring-(--section-accent) group-focus-visible:ring-2 group-focus-visible:ring-accent dark:ring-white/8",
										coverAspect,
									)}
								>
									{event.images[0] ? (
										<ResponsiveImage
											keyBase={event.images[0]}
											alt={`${event.title} cover`}
											sizes={coverSizes}
											priority={i < 3}
											className="absolute inset-0 h-full w-full object-contain transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:scale-[1.03]"
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

				<Reveal delayMs={220}>
					<div className="mt-10 sm:mt-14">
						<Link href="/events" className={cn(buttonVariants({ variant: "secondary" }), "group")}>
							See all events
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</Link>
					</div>
				</Reveal>
			</Container>
		</Section>
	);
}

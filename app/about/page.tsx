import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PortraitPlate } from "@/components/about/portrait-plate";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllArtworks, getAllWorkshops, getSetting, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
	title: "About",
	description:
		"On preserving folk traditions through practice. Madhubani, Pichwai, Lippan and Gond painting by Megha Seth.",
	path: "/about/",
});

interface AboutSection {
	eyebrow?: string;
	title?: string;
	paragraphs?: readonly string[];
	pullQuote?: string;
	asideHeading?: string;
	asideBody?: string;
}

/** Numeral + noun pair for the counts line, in the wall-label register. */
function CountFact({ value, label }: Readonly<{ value: number; label: string }>) {
	return (
		<span className="inline-flex items-baseline gap-1.5">
			<span className="t-numeral text-title text-accent-text">{value}</span>
			<span>{label}</span>
		</span>
	);
}

/** Margin note: a borderless card headed by a short gold rule + eyebrow (2.5). */
function MarginNote({
	eyebrow,
	children,
	delayMs,
}: Readonly<{ eyebrow: string; children: ReactNode; delayMs: number }>) {
	return (
		<Reveal delayMs={delayMs}>
			<Card padding="none" className="border-0 shadow-none">
				<AccentRule variant="gold" className="mb-3 block w-8" />
				<p className="t-eyebrow">{eyebrow}</p>
				{children}
			</Card>
		</Reveal>
	);
}

export default async function AboutPage() {
	const { brand, sections } = getSite();
	const about = (sections.about ?? {}) as AboutSection;
	const [profileImage, artworks, workshops] = await Promise.all([
		getSetting("profileImage"),
		getAllArtworks(),
		getAllWorkshops(),
	]);
	// "Traditions" = distinct styles present in the live catalog (the seam),
	// so the line never drifts from what is actually on the walls.
	const traditions = new Set(artworks.map((piece) => piece.style)).size;

	return (
		<main className="[--shadow-ink:0.2_0.025_75]">
			{/* The standard public page header (visual-direction 2.0): grand rhythm
			    on the flat marigold wash band, short kachni under the eyebrow. */}
			<Section accent="marigold" background="wash" rhythm="grand" padded>
				<PageHeader
					kachni
					eyebrow={about.eyebrow ?? "About"}
					title={about.title ?? "On preserving folk traditions through practice"}
				>
					{/* Counts line: live seam values, numerals in the numeral voice (2.5). */}
					<Reveal eager delayMs={staggerDelay(3)}>
						<p className="t-meta mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ink-soft">
							<CountFact
								value={artworks.length}
								label={artworks.length === 1 ? "piece" : "pieces"}
							/>
							<span aria-hidden="true">·</span>
							<CountFact value={traditions} label={traditions === 1 ? "tradition" : "traditions"} />
							<span aria-hidden="true">·</span>
							<CountFact
								value={workshops.length}
								label={workshops.length === 1 ? "workshop" : "workshops"}
							/>
						</p>
					</Reveal>
				</PageHeader>
			</Section>

			{/* The monograph spread (2.5): marginalia / essay at 62ch / sticky plate. */}
			<Section accent="marigold" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-12 md:grid-cols-12 md:gap-14">
					{/* The artist plate leads at 390; from md it hangs in the right
					    column, sticky at the header offset. Not inside a Reveal: it
					    carries the route's one priority image (guard 3). */}
					<div className="md:col-span-4 md:col-start-9 md:row-start-1">
						<PortraitPlate
							className="md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))]"
							imageKey={profileImage}
							monogram={brand.devanagariMark}
							alt={`${brand.publicName}, folk artist`}
							title={brand.publicName}
							meta={[brand.tagline ?? "", brand.location]}
						/>
					</div>

					{/* Essay: drop-cap first paragraph, 62ch measure, the pull quote
					    ruled from the centre in gold (border-l treatment retired). */}
					<div className="flex max-w-(--measure-essay) flex-col gap-6 md:col-span-6 md:col-start-3 md:row-start-1">
						{(about.paragraphs ?? []).map((p, i) => (
							<Reveal key={p.slice(0, 24)} eager={i === 0} delayMs={staggerDelay(i)}>
								<p className={cn("t-body", i === 0 && "drop-cap")}>{p}</p>
							</Reveal>
						))}

						{about.pullQuote ? (
							<Reveal delayMs={staggerDelay(3)}>
								<blockquote className="my-6 text-center">
									<AccentRule variant="gold" origin="center" className="block h-px w-full" />
									<div className="py-8">
										<span
											aria-hidden="true"
											className="t-display block select-none text-4xl leading-none text-(--section-accent) opacity-25"
										>
											&ldquo;
										</span>
										<p className="t-display mt-2 text-title">{about.pullQuote}</p>
									</div>
									<AccentRule variant="gold" origin="center" className="block h-px w-full" />
								</blockquote>
							</Reveal>
						) : null}

						<Reveal delayMs={staggerDelay(4)}>
							<p className="mt-2 text-right" aria-hidden="true">
								<span lang="hi" className="font-devanagari text-3xl text-ink-soft">
									इति
								</span>
							</p>
						</Reveal>
					</div>

					{/* Marginalia: the aside cards as margin notes (2.5), sticky in turn. */}
					<aside className="md:col-span-2 md:col-start-1 md:row-start-1">
						<div className="flex flex-col gap-10 md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))]">
							<MarginNote eyebrow="Based in" delayMs={staggerDelay(1)}>
								<p className="t-display mt-2 text-2xl">{brand.location}</p>
							</MarginNote>
							{about.asideHeading || about.asideBody ? (
								<MarginNote eyebrow={about.asideHeading ?? "Open to"} delayMs={staggerDelay(2)}>
									<p className="mt-2 text-sm text-muted">{about.asideBody}</p>
								</MarginNote>
							) : null}
							{/* Quiet closing CTA: turn the editorial page into a path onward
							    (internal link to the commission flow, no hard sell). */}
							<MarginNote eyebrow="Commission" delayMs={staggerDelay(3)}>
								<p className="mt-2 text-sm text-muted">
									Have a piece in mind? We take on a few custom works at a time.
								</p>
								<Link
									href="/custom-orders"
									className={cn(buttonVariants({ variant: "secondary" }), "group mt-4 w-full")}
								>
									Commission a piece
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-1"
									/>
								</Link>
							</MarginNote>
						</div>
					</aside>
				</div>
			</Section>
		</main>
	);
}

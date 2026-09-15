import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PortraitPlate } from "@/components/about/portrait-plate";
import { Reveal } from "@/components/motion/reveal";
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
		<span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
			<span className="t-numeral text-title text-accent-text">{value}</span>
			<span>{label}</span>
		</span>
	);
}

/** Margin note with the same simple eyebrow as the page heading. */
function MarginNote({
	eyebrow,
	children,
	delayMs,
}: Readonly<{ eyebrow: string; children: ReactNode; delayMs: number }>) {
	return (
		<Reveal delayMs={delayMs}>
			<Card padding="none" className="border-0 shadow-none">
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
			<Section accent="marigold" background="wash" padded containerClassName="py-(--space-block)">
				<PageHeader
					eyebrow={about.eyebrow ?? "About"}
					title={about.title ?? "On preserving folk traditions through practice"}
				>
					{/* Counts line: live seam values, numerals in the numeral voice (2.5). */}
					<Reveal eager delayMs={staggerDelay(3)}>
						<p className="t-meta mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-ink-soft">
							<CountFact
								value={artworks.length}
								label={artworks.length === 1 ? "piece" : "pieces"}
							/>
							<CountFact value={traditions} label={traditions === 1 ? "tradition" : "traditions"} />
							<CountFact
								value={workshops.length}
								label={workshops.length === 1 ? "workshop" : "workshops"}
							/>
						</p>
					</Reveal>
					<Link
						href="/work"
						className={cn(buttonVariants({ variant: "secondary" }), "mt-5 w-full sm:w-auto")}
					>
						Explore the artwork
						<ArrowRight size={16} aria-hidden="true" />
					</Link>
				</PageHeader>
			</Section>

			{/* The monograph spread (2.5): marginalia / essay at 62ch / sticky plate. */}
			<Section accent="marigold" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-8 md:grid-cols-12 md:gap-10">
					{/* The artist plate leads at 390; from md it hangs in the right
					    column, sticky at the header offset. Not inside a Reveal: it
					    carries the route's one priority image (guard 3). */}
					<div className="mx-auto w-full max-w-64 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1 md:max-w-none">
						<PortraitPlate
							className="md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))]"
							imageKey={profileImage}
							monogram={brand.devanagariMark}
							alt={`${brand.publicName}, folk artist`}
							title={brand.publicName}
							meta={[brand.tagline ?? "", brand.location]}
						/>
					</div>

					{/* The essay and pull quote share a readable measure; space and
					    quotation typography distinguish the quote. */}
					<div className="flex max-w-(--measure-essay) flex-col gap-6 md:col-span-8 md:col-start-1 md:row-start-1">
						{(about.paragraphs ?? []).map((p, i) => (
							<Reveal key={p.slice(0, 24)} eager={i === 0} delayMs={staggerDelay(i)}>
								<p className={cn("t-body", i === 0 && "drop-cap")}>{p}</p>
							</Reveal>
						))}

						{about.pullQuote ? (
							<Reveal delayMs={staggerDelay(3)}>
								<blockquote className="my-6 py-8 text-center">
									<span
										aria-hidden="true"
										className="t-display block select-none text-4xl leading-none text-(--section-accent) opacity-25"
									>
										&ldquo;
									</span>
									<p className="t-display mt-2 text-title">{about.pullQuote}</p>
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

					<aside className="border-t border-line pt-8 md:col-span-8 md:col-start-1 md:row-start-2">
						<div className="grid gap-8 sm:grid-cols-2">
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
									Have a piece in mind? Tell us about the subject, size, or occasion.
								</p>
								<Link
									href="/custom-orders"
									className={cn(
										buttonVariants({ variant: "secondary" }),
										"group mt-4 w-full whitespace-normal",
									)}
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

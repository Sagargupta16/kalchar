import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PortraitPlate } from "@/components/about/portrait-plate";
import { PullQuote } from "@/components/about/pull-quote";
import { Traditions } from "@/components/about/traditions";
import { Masthead } from "@/components/editorial/masthead";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { getAllArtworks, getAllWorkshops, getCategoryNames, getSetting, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, toRoman } from "@/lib/utils";

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

/**
 * The about page as a story in five beats: a marigold masthead with the
 * artist plate and count-up stats; the essay as numbered chapters with a
 * sticky roman numeral rail; the pull quote on a deep pigment band in
 * kinetic type; the traditions as pigment tiles that open each style on
 * /work; and a closing band with where she works, what she is open to and
 * the commission path.
 */
export default async function AboutPage() {
	const { brand, sections } = getSite();
	const about = (sections.about ?? {}) as AboutSection;
	const [profileImage, artworks, workshops, styles] = await Promise.all([
		getSetting("profileImage"),
		getAllArtworks(),
		getAllWorkshops(),
		getCategoryNames(),
	]);
	// "Traditions" = distinct styles present in the live catalog (the seam),
	// so the line never drifts from what is actually on the walls.
	const traditions = new Set(artworks.map((piece) => piece.style)).size;
	const paragraphs = about.paragraphs ?? [];

	return (
		<main>
			<Masthead
				accent="marigold"
				glyph={brand.devanagariMark}
				eyebrow={about.eyebrow ?? "About"}
				title={about.title ?? "On preserving folk traditions through practice"}
				accentLast
				stats={[
					{ value: artworks.length, label: artworks.length === 1 ? "Piece" : "Pieces" },
					{ value: traditions, label: traditions === 1 ? "Tradition" : "Traditions" },
					{ value: workshops.length, label: workshops.length === 1 ? "Workshop" : "Workshops" },
				]}
				actions={
					<Link
						href="/work"
						className={cn(buttonVariants({ variant: "primary", size: "lg" }), "group")}
					>
						Explore the artwork
						<ArrowRight
							size={16}
							aria-hidden="true"
							className="transition-transform group-hover:translate-x-1"
						/>
					</Link>
				}
				aside={
					// The artist plate carries the route's one priority image, so it
					// is never inside a scroll Reveal.
					<PortraitPlate
						className="mx-auto w-full max-w-64 sm:max-w-72 lg:max-w-80"
						imageKey={profileImage}
						monogram={brand.devanagariMark}
						alt={`${brand.publicName}, folk artist`}
						title={brand.publicName}
						meta={[brand.tagline ?? "", brand.location]}
					/>
				}
			/>

			{/* The essay as chapters: a sticky roman numeral beside each paragraph
			    at the readable 62ch measure. */}
			<Section accent="marigold" padded rhythm="grand">
				<ol className="grid gap-(--space-canyon)">
					{paragraphs.map((p, i) => (
						<li key={p.slice(0, 24)} className="grid gap-4 md:grid-cols-12 md:gap-10">
							<Reveal
								direction="left"
								className="md:sticky md:top-[calc(var(--header-h-shrunk)+var(--space-page))] md:col-span-3 md:self-start"
							>
								<p aria-hidden="true" className="flex items-center gap-4">
									<span className="t-headline text-h1 text-accent-text">{toRoman(i + 1)}</span>
									<span className="h-px flex-1 bg-line md:max-w-16" />
								</p>
							</Reveal>
							<Reveal delayMs={staggerDelay(1)} className="md:col-span-9">
								<p
									className={cn(
										"t-body max-w-(--measure-essay)",
										i === 0 && "drop-cap text-lg leading-relaxed text-ink",
									)}
								>
									{p}
								</p>
							</Reveal>
						</li>
					))}
				</ol>
			</Section>

			{about.pullQuote ? <PullQuote quote={about.pullQuote} /> : null}

			{styles.length > 0 ? (
				<Section accent="marigold" padded rhythm="grand">
					<SectionHeader
						eyebrow="In practice"
						title="The traditions"
						lead="Every piece on the walls, grouped by the tradition it is painted in."
					/>
					<div className="mt-(--space-block)">
						<Traditions styles={styles} artworks={artworks} />
					</div>
				</Section>
			) : null}

			<Section accent="pichwai" background="pigment" padded>
				<div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-10">
					<div className="md:col-span-7">
						<SectionHeader
							eyebrow="Commission"
							title="Have a piece in mind?"
							lead="Tell us about the subject, size, or occasion."
						/>
						<Reveal delayMs={staggerDelay(3)}>
							<Link
								href="/custom-orders"
								className={cn(
									buttonVariants({ variant: "primary", size: "lg" }),
									"group mt-8 w-full sm:w-auto",
								)}
							>
								Commission a piece
								<ArrowRight
									size={16}
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-1"
								/>
							</Link>
						</Reveal>
					</div>
					<dl className="grid gap-6 border-t border-line pt-6 sm:grid-cols-2 md:col-span-5 md:border-t-0 md:border-l md:pt-0 md:pl-10">
						<Reveal delayMs={staggerDelay(1)}>
							<dt className="t-eyebrow">Based in</dt>
							<dd className="t-display mt-2 text-title">{brand.location}</dd>
						</Reveal>
						{about.asideHeading || about.asideBody ? (
							<Reveal delayMs={staggerDelay(2)}>
								<dt className="t-eyebrow">{about.asideHeading ?? "Open to"}</dt>
								<dd className="mt-2 text-sm text-muted">{about.asideBody}</dd>
							</Reveal>
						) : null}
					</dl>
				</div>
			</Section>
		</main>
	);
}

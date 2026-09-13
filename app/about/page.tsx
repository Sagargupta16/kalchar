import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArtistAvatar } from "@/components/about/artist-avatar";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSetting, getSite } from "@/lib/data";
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

export default async function AboutPage() {
	const { brand, sections } = getSite();
	const about = (sections.about ?? {}) as AboutSection;
	const profileImage = await getSetting("profileImage");

	return (
		<main className="[--shadow-ink:0.2_0.025_75]">
			<Section accent="marigold" padded>
				<PageHeader
					eyebrow={about.eyebrow ?? "About"}
					title={about.title ?? "On preserving folk traditions through practice"}
				/>

				<div className="mt-(--space-block) grid gap-12 md:grid-cols-12 md:gap-14">
					{/* Body: paragraphs cap at the header measure (42rem, about 75 characters). */}
					<div className="flex max-w-(--header-max) flex-col gap-6 md:col-span-8">
						{(about.paragraphs ?? []).map((p, i) => (
							<Reveal key={p.slice(0, 24)} eager={i === 0} delayMs={staggerDelay(i)}>
								<p className={cn("t-body", i === 0 && "drop-cap")}>{p}</p>
							</Reveal>
						))}

						{about.pullQuote ? (
							<Reveal delayMs={staggerDelay(3)}>
								<blockquote className="relative my-6 border-l-2 border-(--section-accent) pl-8 sm:pl-12">
									<span
										aria-hidden="true"
										className="t-display pointer-events-none absolute -top-5 left-0 select-none text-6xl leading-none text-(--section-accent) opacity-25"
									>
										&ldquo;
									</span>
									<p className="t-display text-title">{about.pullQuote}</p>
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

					{/* Aside */}
					<aside className="md:col-span-4">
						<Reveal delayMs={staggerDelay(0)}>
							<ArtistAvatar
								imageKey={profileImage}
								monogram={brand.devanagariMark}
								alt={`${brand.publicName}, folk artist`}
								sizes="(min-width: 768px) 30vw, 100vw"
							/>
						</Reveal>
						<Reveal delayMs={staggerDelay(1)}>
							<Card padding="md" className="mt-4">
								<p className="t-eyebrow">Based in</p>
								<p className="t-display mt-2 text-2xl">{brand.location}</p>
							</Card>
						</Reveal>
						{about.asideHeading || about.asideBody ? (
							<Reveal delayMs={staggerDelay(2)}>
								<Card padding="md" className="mt-4">
									<p className="t-eyebrow">{about.asideHeading ?? "Open to"}</p>
									<p className="mt-2 text-sm text-muted">{about.asideBody}</p>
								</Card>
							</Reveal>
						) : null}
						{/* Quiet closing CTA: turn the editorial page into a path onward
						    (internal link to the commission flow, no hard sell). */}
						<Reveal delayMs={staggerDelay(3)}>
							<Card padding="md" className="mt-4">
								<p className="t-eyebrow">Commission</p>
								<p className="mt-2 text-sm text-muted">
									Have a piece in mind? We take on a few custom works at a time.
								</p>
								<Link
									href="/custom-orders"
									className={cn(
										buttonVariants({ variant: "secondary" }),
										"group mt-4 w-full sm:w-auto",
									)}
								>
									Commission a piece
									<ArrowRight
										size={14}
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-1"
									/>
								</Link>
							</Card>
						</Reveal>
					</aside>
				</div>
			</Section>
		</main>
	);
}

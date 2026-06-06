import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";

export const metadata: Metadata = {
	title: "About",
	description:
		"On preserving folk traditions through practice. Madhubani, Pichwai, Lippan and Gond painting by Megha Seth.",
};

interface AboutSection {
	eyebrow?: string;
	title?: string;
	paragraphs?: readonly string[];
	pullQuote?: string;
	asideHeading?: string;
	asideBody?: string;
}

export default function AboutPage() {
	const { brand, sections } = getSite();
	const a = (sections.about ?? {}) as AboutSection;

	return (
		<main>
			<Section accent="marigold">
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow={a.eyebrow ?? "About"}
						title={a.title ?? "On preserving folk traditions through practice"}
					/>

					<div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-14">
						{/* Body */}
						<div className="space-y-6 md:col-span-8">
							{(a.paragraphs ?? []).map((p, i) => (
								<Reveal key={p.slice(0, 24)} eager={i === 0} delayMs={i * 80}>
									<p className={`t-body text-ink ${i === 0 ? "drop-cap" : ""}`}>{p}</p>
								</Reveal>
							))}

							{a.pullQuote ? (
								<Reveal delayMs={280}>
									<blockquote className="relative mt-12 mb-6 pl-8 sm:pl-12">
										<span
											aria-hidden="true"
											className="t-display pointer-events-none absolute -top-5 left-0 select-none text-6xl leading-none text-(--section-accent) opacity-25"
										>
											&ldquo;
										</span>
										<p className="t-display text-2xl text-(--section-accent) sm:text-3xl">
											{a.pullQuote}
										</p>
									</blockquote>
								</Reveal>
							) : null}

							<Reveal delayMs={360}>
								<p className="mt-2 text-right" aria-hidden="true">
									<span
										lang="hi"
										className="font-devanagari text-3xl text-(--section-accent) opacity-60"
									>
										इति
									</span>
								</p>
							</Reveal>
						</div>

						{/* Aside */}
						<aside className="md:col-span-4">
							<Reveal>
								<Card padding="md">
									<p className="t-eyebrow">Based in</p>
									<p className="t-display mt-2 text-2xl">{brand.location}</p>
								</Card>
							</Reveal>
							{a.asideHeading || a.asideBody ? (
								<Reveal delayMs={100}>
									<Card padding="md" className="mt-4">
										<p className="t-eyebrow">{a.asideHeading ?? "Open to"}</p>
										<p className="mt-2 text-sm text-muted">{a.asideBody}</p>
									</Card>
								</Reveal>
							) : null}
						</aside>
					</div>
				</Container>
			</Section>
		</main>
	);
}

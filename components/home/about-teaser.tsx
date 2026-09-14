import { ArtistAvatar } from "@/components/about/artist-avatar";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";

interface AboutTeaserProps {
	eyebrow: string;
	title: string;
	lead?: string;
	location: string;
	/** Short artist intro shown when the maintainer enables it (with the avatar). */
	intro?: string;
	/** R2 key-base for the artist photo; falls back to the monogram when absent. */
	profileImage?: string;
	/** Brand devanagari mark for the avatar fallback. */
	monogram?: string;
	publicName?: string;
}

export function AboutTeaser({
	eyebrow,
	title,
	lead,
	location,
	intro,
	profileImage,
	monogram,
	publicName,
}: Readonly<AboutTeaserProps>) {
	// The intro layout (avatar + text side by side) shows only when the
	// maintainer has opted in via the home-intro toggle; otherwise the teaser
	// keeps its original centered form.
	const showIntro = Boolean(intro);

	if (showIntro) {
		return (
			<Section id="about" accent="marigold" background="canvas" padded borderBottom>
				<div className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-12">
					<Reveal className="w-40 sm:w-48 md:w-56">
						<ArtistAvatar
							imageKey={profileImage}
							monogram={monogram ?? "म"}
							alt={`${publicName ?? "The artist"}, folk artist`}
							sizes="(min-width: 768px) 14rem, 12rem"
						/>
					</Reveal>
					<div>
						<Reveal>
							<SectionHeader eyebrow={eyebrow} title={title} lead={intro} />
						</Reveal>
						<Reveal delayMs={staggerDelay(1)}>
							<p className="mt-4 text-sm text-muted">Working from {location}</p>
						</Reveal>
						<Reveal delayMs={staggerDelay(2)}>
							<div className="mt-8">
								<SectionCta href="/about">
									Read more<span className="sr-only"> about Megha</span>
								</SectionCta>
							</div>
						</Reveal>
					</div>
				</div>
			</Section>
		);
	}

	return (
		<Section
			id="about"
			accent="marigold"
			background="canvas"
			padded
			size="narrow"
			borderBottom
			containerClassName="text-center"
		>
			<Reveal>
				<SectionHeader centered eyebrow={eyebrow} title={title} lead={lead} />
			</Reveal>
			<Reveal delayMs={staggerDelay(1)}>
				<p className="mt-4 text-sm text-muted">Working from {location}</p>
			</Reveal>
			<Reveal delayMs={staggerDelay(2)}>
				<div className="mt-8">
					<SectionCta href="/about">
						Read more<span className="sr-only"> about Megha</span>
					</SectionCta>
				</div>
			</Reveal>
		</Section>
	);
}

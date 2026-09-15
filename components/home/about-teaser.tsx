import { ArtistAvatar } from "@/components/about/artist-avatar";
import { PlateFrame } from "@/components/gallery/plate-frame";
import { WallLabel } from "@/components/gallery/wall-label";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";

interface AboutTeaserProps {
	eyebrow: string;
	title: string;
	lead?: string;
	location: string;
	/** Brand tagline for the portrait's wall label (visual-direction 2.1 change 6). */
	tagline?: string;
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
	tagline,
	intro,
	profileImage,
	monogram,
	publicName,
}: Readonly<AboutTeaserProps>) {
	// The intro layout (avatar + text side by side) shows only when the
	// maintainer has opted in via the home-intro toggle; otherwise the teaser
	// keeps its original centered form. Either way the section sits on the
	// marigold wash band.
	const showIntro = Boolean(intro);

	if (showIntro) {
		return (
			<Section id="about" accent="marigold" background="wash" padded rhythm="grand">
				<div className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-12">
					<Reveal className="w-40 sm:w-48 md:w-56">
						{/* The artist plate: gold inset at rest, museum wall label below
						    (visual-direction 2.1 change 6). The avatar's own chrome is
						    neutralised so the frame owns radius and shadow. */}
						<PlateFrame goldRest className="aspect-3/4">
							<ArtistAvatar
								imageKey={profileImage}
								monogram={monogram ?? "म"}
								alt={`${publicName ?? "The artist"}, folk artist`}
								sizes="(min-width: 768px) 14rem, 12rem"
								className="absolute inset-0 aspect-auto h-full w-full rounded-none shadow-none"
							/>
						</PlateFrame>
						<WallLabel
							variant="compact"
							title={publicName ?? "The artist"}
							meta={[tagline ?? "", location]}
							className="mt-4"
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
			background="wash"
			padded
			rhythm="grand"
			size="narrow"
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

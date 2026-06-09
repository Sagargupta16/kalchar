import Link from "next/link";
import { ArtistAvatar } from "@/components/about/artist-avatar";
import { Reveal } from "@/components/motion/reveal";
import { AccentRule } from "@/components/ui/accent-rule";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

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
			<Section accent="marigold" background="soft" borderBottom>
				<Container className="py-(--section-py)">
					<div className="grid items-center gap-10 md:grid-cols-[auto_1fr] md:gap-12">
						<Reveal className="mx-auto w-40 sm:w-48 md:w-56">
							<ArtistAvatar
								imageKey={profileImage}
								monogram={monogram ?? "म"}
								alt={`${publicName ?? "The artist"}, folk artist`}
								sizes="(min-width: 768px) 14rem, 12rem"
							/>
						</Reveal>
						<div>
							<Reveal>
								<p className="t-eyebrow flex items-center gap-2">
									<AccentRule />
									{eyebrow}
								</p>
							</Reveal>
							<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl">
								{title}
							</Reveal>
							<Reveal delayMs={160}>
								<p className="t-lead mt-4 max-w-lg">{intro}</p>
							</Reveal>
							<Reveal delayMs={220}>
								<p className="mt-4 text-sm text-muted">Working from {location}</p>
							</Reveal>
							<Reveal delayMs={280}>
								<div className="mt-7">
									<Link href="/about" className={buttonVariants({ variant: "ghost" })}>
										Read more<span className="sr-only"> about Megha</span>
									</Link>
								</div>
							</Reveal>
						</div>
					</div>
				</Container>
			</Section>
		);
	}

	return (
		<Section accent="marigold" background="soft" borderBottom>
			<Container size="narrow" className="py-(--section-py) text-center">
				<Reveal>
					<p className="t-eyebrow flex items-center justify-center gap-2">
						<AccentRule />
						{eyebrow}
						<AccentRule />
					</p>
				</Reveal>
				<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl">
					{title}
				</Reveal>
				{lead ? (
					<Reveal delayMs={160}>
						<p className="t-lead mt-5 mx-auto max-w-lg">{lead}</p>
					</Reveal>
				) : null}
				<Reveal delayMs={200}>
					<p className="mt-5 text-sm text-muted">Working from {location}</p>
				</Reveal>
				<Reveal delayMs={260}>
					<div className="mt-7">
						<Link href="/about" className={buttonVariants({ variant: "ghost" })}>
							Read more<span className="sr-only"> about Megha</span>
						</Link>
					</div>
				</Reveal>
			</Container>
		</Section>
	);
}

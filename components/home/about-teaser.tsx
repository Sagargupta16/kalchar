import Link from "next/link";
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
}

export function AboutTeaser({ eyebrow, title, lead, location }: Readonly<AboutTeaserProps>) {
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

import { Clock } from "lucide-react";
import Link from "next/link";
import { SectionCta } from "@/components/home/section-cta";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { IconCircle } from "@/components/ui/icon-circle";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Workshop } from "@/lib/types";

interface WorkshopsTeaserProps {
	workshops: readonly Workshop[];
	eyebrow: string;
	title: string;
	lead?: string;
}

export function WorkshopsTeaser({
	workshops,
	eyebrow,
	title,
	lead,
}: Readonly<WorkshopsTeaserProps>) {
	return (
		<Section id="workshops" accent="pichwai" padded borderBottom>
			<Reveal>
				<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
			</Reveal>

			<ul className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-2 lg:grid-cols-3">
				{workshops.map((item, i) => (
					<Reveal key={item.slug} as="li" delayMs={staggerDelay(i)}>
						<Link
							href={`/workshops#${item.slug}`}
							className="group block h-full rounded-(--radius-md)"
						>
							<Card interactive className="flex h-full flex-col">
								<h3 className="t-display text-h3 transition-colors group-hover:text-(--section-accent)">
									{item.title}
								</h3>
								<p className="mt-3 line-clamp-3 text-sm text-muted">{item.blurb}</p>
								{item.durationHours ? (
									<div className="mt-4 flex items-center gap-1.5">
										<IconCircle size="sm">
											<Clock size={14} aria-hidden="true" />
										</IconCircle>
										<span className="t-meta text-(--section-accent)">
											{item.durationHours}h session
										</span>
									</div>
								) : null}
							</Card>
						</Link>
					</Reveal>
				))}
			</ul>

			<Reveal delayMs={staggerDelay(3)}>
				<div className="mt-(--space-block)">
					<SectionCta href="/workshops">See all workshops</SectionCta>
				</div>
			</Reveal>
		</Section>
	);
}

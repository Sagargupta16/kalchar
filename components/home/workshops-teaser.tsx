import { Clock } from "lucide-react";
import Link from "next/link";
import { KachniRule } from "@/components/decor/kachni-rule";
import { SectionCta } from "@/components/home/section-cta";
import { Spread } from "@/components/home/spread";
import { Reveal } from "@/components/motion/reveal";
import { IconCircle } from "@/components/ui/icon-circle";
import { Section, SectionHeader } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Workshop } from "@/lib/types";
import { toRoman } from "@/lib/utils";

interface WorkshopsTeaserProps {
	workshops: readonly Workshop[];
	eyebrow: string;
	title: string;
	lead?: string;
}

/**
 * Home workshops preview as a roman-numeral ledger (visual-direction 2.1
 * change 6): hairline rows instead of card shells, each numbered I / II / III
 * in the pichwai pigment via the numeral voice; title, blurb and the clock
 * duration line are all kept from the card era.
 */
export function WorkshopsTeaser({
	workshops,
	eyebrow,
	title,
	lead,
}: Readonly<WorkshopsTeaserProps>) {
	return (
		<Section id="workshops" accent="pichwai" padded rhythm="grand">
			<KachniRule form="long" className="mb-(--space-block)" />
			<Spread
				header={
					<Reveal>
						<SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
					</Reveal>
				}
			>
				<ul className="divide-y divide-line">
					{workshops.map((item, i) => (
						<Reveal key={item.slug} as="li" delayMs={staggerDelay(i)}>
							<Link
								href={`/workshops#${item.slug}`}
								className="group flex gap-5 py-6 md:gap-6 md:py-8"
							>
								<span
									aria-hidden="true"
									className="t-numeral w-10 shrink-0 pt-1 text-title text-(--section-accent)"
								>
									{toRoman(i + 1)}
								</span>
								<div className="min-w-0 flex-1">
									<h3 className="t-display text-h3 transition-colors group-hover:text-(--section-accent)">
										{item.title}
									</h3>
									<p className="mt-2 line-clamp-3 text-sm text-muted">{item.blurb}</p>
									{item.durationHours ? (
										<div className="mt-3 flex items-center gap-1.5">
											<IconCircle size="sm">
												<Clock size={14} aria-hidden="true" />
											</IconCircle>
											<span className="t-meta text-(--section-accent)">
												{item.durationHours}h session
											</span>
										</div>
									) : null}
								</div>
							</Link>
						</Reveal>
					))}
				</ul>

				<Reveal delayMs={staggerDelay(3)}>
					<div className="mt-(--space-block)">
						<SectionCta href="/workshops">See all workshops</SectionCta>
					</div>
				</Reveal>
			</Spread>
		</Section>
	);
}

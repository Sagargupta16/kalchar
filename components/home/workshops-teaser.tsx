import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
import { Section } from "@/components/ui/section";
import type { Workshop } from "@/lib/types";

interface WorkshopsTeaserProps {
	workshops: readonly Workshop[];
	totalCount: number;
	eyebrow: string;
	title: string;
	lead?: string;
}

export function WorkshopsTeaser({
	workshops,
	totalCount,
	eyebrow,
	title,
	lead,
}: Readonly<WorkshopsTeaserProps>) {
	return (
		<Section accent="pichwai" borderBottom>
			<Container className="py-(--section-py)">
				<header className="max-w-2xl">
					<Reveal>
						<p className="t-eyebrow flex items-center gap-2">
							<span aria-hidden="true" className="inline-block h-px w-5 bg-(--section-accent)" />
							{eyebrow}
						</p>
					</Reveal>
					<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl">
						{title}
					</Reveal>
					{lead ? (
						<Reveal delayMs={140}>
							<p className="t-lead mt-4">{lead}</p>
						</Reveal>
					) : null}
				</header>

				<ul className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
					{workshops.map((item, i) => (
						<Reveal key={item.slug} as="li" delayMs={i * 60}>
							<Card hover className="flex h-full flex-col">
								<h3 className="t-display text-xl transition-colors group-hover:text-(--section-accent)">
									{item.title}
								</h3>
								<p className="mt-3 line-clamp-3 text-sm text-muted">{item.blurb}</p>
								{item.durationHours ? (
									<div className="mt-4 flex items-center gap-1.5">
										<IconCircle size="sm">
											<Clock size={13} />
										</IconCircle>
										<span className="text-xs uppercase tracking-[var(--tracking-meta)] text-(--section-accent)">
											{item.durationHours}h session
										</span>
									</div>
								) : null}
							</Card>
						</Reveal>
					))}
				</ul>

				<Reveal delayMs={220}>
					<div className="mt-10 sm:mt-14">
						<Link
							href="/workshops"
							className="group inline-flex items-center gap-2 text-sm uppercase tracking-[var(--tracking-meta)] text-(--section-accent) transition-colors hover:opacity-80"
						>
							See all {totalCount} sessions
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</Link>
					</div>
				</Reveal>
			</Container>
		</Section>
	);
}

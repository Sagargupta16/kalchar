import type { ComponentProps, ReactNode } from "react";
import { CountUp } from "@/components/editorial/count-up";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";
import "./editorial.css";

export interface MastheadStat {
	value: number;
	label: string;
	/** Start of the count-up (defaults to 0). */
	from?: number;
}

interface MastheadProps {
	accent: ComponentProps<typeof Section>["accent"];
	eyebrow: string;
	title: string;
	lead?: string;
	/** Set the title's last word in the accent italic. */
	accentLast?: boolean;
	/** Devanagari ornament hung off the band's right edge (aria-hidden). */
	glyph?: string;
	/** Buttons under the lead; they rise after the title lands. */
	actions?: ReactNode;
	/** Count-up numerals on a drawn hairline under the heading. */
	stats?: readonly MastheadStat[];
	/** Right column from lg (a plate fan, a portrait). */
	aside?: ReactNode;
	asideClassName?: string;
}

/**
 * The inner-page masthead: a full-bleed deep pigment band (the home page's
 * custom-orders and workshops language) carrying the kinetic PageHeader,
 * a slow-swaying devanagari ornament, optional actions, an optional right
 * column and a row of count-up stats on a hairline that draws in.
 */
export function Masthead({
	accent,
	eyebrow,
	title,
	lead,
	accentLast = false,
	glyph,
	actions,
	stats,
	aside,
	asideClassName,
}: Readonly<MastheadProps>) {
	return (
		<Section
			accent={accent}
			background="pigment"
			padded
			className="overflow-hidden [contain:paint]"
			containerClassName="relative pt-10 pb-10 sm:pt-12 lg:pt-12 lg:pb-12"
		>
			{glyph ? (
				<span
					aria-hidden="true"
					lang="hi"
					className="masthead-glyph font-devanagari text-(--section-accent)"
				>
					{glyph}
				</span>
			) : null}
			<div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10">
				<div className={aside ? "lg:col-span-7" : "lg:col-span-9"}>
					<PageHeader eyebrow={eyebrow} title={title} lead={lead} accentLast={accentLast}>
						{actions ? (
							<Reveal eager delayMs={staggerDelay(5) + 120}>
								<div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
									{actions}
								</div>
							</Reveal>
						) : null}
					</PageHeader>
				</div>
				{aside ? <div className={cn("lg:col-span-5", asideClassName)}>{aside}</div> : null}
			</div>
			{stats && stats.length > 0 ? <StatRow stats={stats} /> : null}
		</Section>
	);
}

function StatRow({ stats }: Readonly<{ stats: readonly MastheadStat[] }>) {
	return (
		<dl
			className={cn(
				"relative mt-8 grid gap-4 pt-6 sm:mt-10 sm:gap-8",
				stats.length === 2 ? "grid-cols-2" : "grid-cols-3",
				"lg:max-w-3xl",
			)}
		>
			<span aria-hidden="true" className="stat-rule absolute inset-x-0 top-0 h-px bg-line" />
			{stats.map((stat, i) => (
				<Reveal
					key={stat.label}
					eager
					delayMs={staggerDelay(3) + i * 90}
					className="flex min-w-0 flex-col-reverse justify-end gap-2"
				>
					<dt className="t-meta">{stat.label}</dt>
					<dd className="t-headline text-h2 lining-nums text-(--section-accent) lg:text-h1">
						<CountUp value={stat.value} from={stat.from} delayMs={250 + i * 140} />
					</dd>
				</Reveal>
			))}
		</dl>
	);
}

"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING_INDICATOR, SPRING_ZOOM } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface BriefStep {
	/** Anchor id of the step section (the rail links jump to it). */
	id: string;
	label: string;
	done: boolean;
}

/**
 * The brief's progress rail: five numbered segments that fill as each part
 * of the brief gets an answer, and a count of how many are ready. It sticks
 * under the site header while the visitor works down the form, and every
 * segment is a jump link to its step (links, never buttons: the form keeps
 * one button). The segment fill is a scaleX transform on the pigment bar;
 * a finished segment's number swaps for a check on the zoom spring.
 */
export function BriefProgress({ steps }: Readonly<{ steps: readonly BriefStep[] }>) {
	const ready = steps.filter((step) => step.done).length;
	const current = steps.find((step) => !step.done)?.id;
	return (
		<div
			data-slot="brief-progress"
			className="sticky top-(--header-h-shrunk) z-raised -mx-(--card-pad-lg) border-b border-line bg-surface/95 px-(--card-pad-lg) pt-3 pb-2 backdrop-blur-(--glass-blur)"
		>
			<div className="flex items-baseline justify-between gap-3">
				<p className="t-meta">Your brief</p>
				<p className="text-sm font-medium text-ink" aria-live="polite">
					<span className="t-numeral text-base text-(--section-accent)">{ready}</span> of{" "}
					{steps.length} ready
				</p>
			</div>
			<ol className="mt-2 grid grid-cols-5 gap-1.5">
				{steps.map((step, i) => (
					<li key={step.id} className="min-w-0">
						<a
							href={`#${step.id}`}
							aria-current={step.id === current ? "step" : undefined}
							className="group flex min-h-control flex-col justify-center gap-1.5 rounded-(--radius-sm) px-0.5"
						>
							<span className="relative block h-1 overflow-hidden rounded-full bg-line">
								<span
									className={cn(
										"absolute inset-0 origin-left rounded-full bg-(--section-accent) transition-transform duration-500 ease-(--ease-out)",
										step.done ? "scale-x-100" : "scale-x-0",
									)}
								/>
							</span>
							<span
								className={cn(
									"flex min-w-0 items-center gap-1 text-micro font-medium transition-colors sm:text-xs",
									step.done || step.id === current ? "text-ink" : "text-muted",
									"group-hover:text-accent-text",
								)}
							>
								{step.done ? (
									<motion.span
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={SPRING_ZOOM}
										className="flex shrink-0 text-(--section-accent)"
										aria-hidden="true"
									>
										<Check size={11} strokeWidth={3} />
									</motion.span>
								) : (
									<span aria-hidden="true" className="t-numeral shrink-0 text-(--section-accent)">
										{i + 1}
									</span>
								)}
								<span className="truncate">{step.label}</span>
							</span>
						</a>
					</li>
				))}
			</ol>
		</div>
	);
}

/**
 * One step of the brief: a big numeral, the step title and an optional note,
 * then the step's fields. The section is the rail's jump target and clears
 * the sticky header plus the rail when scrolled to.
 */
export function BriefStepSection({
	id,
	index,
	title,
	note,
	children,
	className,
}: Readonly<{
	id: string;
	index: number;
	title: string;
	note?: string;
	children: ReactNode;
	className?: string;
}>) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className={cn(
				"scroll-mt-[calc(var(--header-h-shrunk)+6rem)] border-t border-line pt-(--form-group-gap) first:border-t-0 first:pt-0",
				className,
			)}
		>
			<div className="flex items-start gap-4">
				<span aria-hidden="true" className="t-numeral type-section text-(--section-accent)">
					{String(index).padStart(2, "0")}
				</span>
				<div className="min-w-0 pt-1">
					<h3 id={`${id}-title`} className="t-headline text-title">
						{title}
					</h3>
					{note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
				</div>
			</div>
			<div className="mt-6 flex flex-col gap-(--form-gap)">{children}</div>
		</section>
	);
}

/** Shared highlight that springs between the chips of one group (layoutId per group). */
export function ChipHighlight({ group }: Readonly<{ group: string }>) {
	return (
		<motion.span
			aria-hidden="true"
			layoutId={`chip-highlight-${group}`}
			transition={SPRING_INDICATOR}
			className="absolute inset-0 -z-10 rounded-full border border-(--section-accent) bg-(--section-accent)/12"
		/>
	);
}

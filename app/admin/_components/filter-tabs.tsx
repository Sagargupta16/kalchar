"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { SPRING_INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface FilterTabOption<K extends string> {
	key: K;
	label: string;
	/** Muted tabular count after the label; omitted renders no count. */
	count?: number;
	/** Overrides the concatenated "Label12" name (e.g. "New 12"); the count is then aria-hidden. */
	ariaLabel?: string;
}

interface FilterTabsProps<K extends string> {
	/** Group name (fieldset aria-label), e.g. "Show" or "Filter enquiries". */
	label: string;
	options: readonly FilterTabOption<K>[];
	value: K;
	onChange: (key: K) => void;
	disabled?: boolean;
	className?: string;
}

/**
 * A lens switcher drawn as a segmented control: one quiet track, a white
 * thumb that slides to the selected lens on SPRING_INDICATOR (layoutId per
 * instance), counts in muted tabular numerals. Semantically a group of
 * aria-pressed buttons (a filter, not a form value), so the Segmented
 * radiogroup stays reserved for stored values like a piece's status. The
 * track scrolls sideways on narrow phones instead of wrapping.
 */
export function FilterTabs<K extends string>({
	label,
	options,
	value,
	onChange,
	disabled = false,
	className,
}: Readonly<FilterTabsProps<K>>) {
	const layoutId = useId();
	return (
		<fieldset
			aria-label={label}
			className={cn(
				"-mx-1 min-w-0 overflow-x-auto border-0 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
				className,
			)}
		>
			<LayoutGroup id={layoutId}>
				<div className="inline-flex min-w-max gap-1 rounded-(--radius-md) bg-bg-muted p-1 ring-1 ring-line dark:bg-canvas">
					{options.map((option) => {
						const selected = option.key === value;
						return (
							<button
								key={option.key}
								type="button"
								aria-pressed={selected}
								aria-label={option.ariaLabel}
								disabled={disabled}
								onClick={() => onChange(option.key)}
								className={cn(
									"relative isolate inline-flex min-h-control shrink-0 items-center gap-1.5 rounded-(--radius-sm) px-3 text-sm font-medium transition-colors pressable disabled:pointer-events-none disabled:opacity-50",
									selected ? "text-ink" : "text-muted hover:bg-surface-hover hover:text-ink",
								)}
							>
								{selected ? (
									<motion.span
										layoutId="filter-tab-thumb"
										aria-hidden="true"
										className="absolute inset-0 -z-10 rounded-(--radius-sm) bg-surface shadow-e2-edged dark:bg-surface-raised"
										transition={SPRING_INDICATOR}
									/>
								) : null}
								{option.label}
								{option.count === undefined ? null : (
									<span
										aria-hidden={option.ariaLabel ? true : undefined}
										className={cn(
											"min-w-4 text-center text-xs tabular-nums",
											selected ? "text-ink-soft" : "text-muted",
										)}
									>
										{option.count}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</LayoutGroup>
		</fieldset>
	);
}

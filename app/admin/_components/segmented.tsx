"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId, useRef } from "react";
import { SPRING_INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { adminHelp, adminStatusDot } from "./controls";

export interface SegmentedOption<V extends string = string> {
	value: V;
	label: string;
	/** Status dot colour class (bg-status-available / bg-status-sold / bg-status-nfs). */
	dotClass?: string;
	disabled?: boolean;
	/** Rendered as the helper line under the track while this option is disabled. */
	disabledReason?: string;
}

interface SegmentedProps<V extends string = string> {
	/** Instance name; keys the sliding pill's layoutId so instances never share one. */
	name: string;
	/** Accessible group name ("Status of {title}"). */
	label: string;
	value: V;
	options: readonly SegmentedOption<V>[];
	disabled?: boolean;
	/** Helper line under the track for the selected value (1.8: NFS reads its gallery line). */
	helper?: string;
	onChange: (value: V) => void;
	className?: string;
}

/**
 * Segmented status control (visual-direction-admin 1.8): a radiogroup whose
 * three 44px segments apply on selection (D37, no confirm), drawn as an ink
 * pill sliding with SPRING_INDICATOR. Arrow keys move selection per the APG
 * radio pattern (selection follows focus and applies at once); each segment
 * carries a leading status dot, never colour-only (the label names the state).
 * Reduced motion: the pill jumps (MotionConfig reducedMotion="user").
 */
export function Segmented<V extends string = string>({
	name,
	label,
	value,
	options,
	disabled = false,
	helper,
	onChange,
	className,
}: Readonly<SegmentedProps<V>>) {
	const groupRef = useRef<HTMLDivElement>(null);
	const layoutId = useId();
	const enabled = options.filter((option) => !option.disabled && !disabled);

	const select = (option: SegmentedOption<V>) => {
		if (disabled || option.disabled || option.value === value) return;
		onChange(option.value);
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const step =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? 1
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? -1
					: 0;
		if (step === 0 || enabled.length === 0) return;
		event.preventDefault();
		const at = enabled.findIndex((option) => option.value === value);
		const next = enabled[(at + step + enabled.length) % enabled.length];
		if (!next) return;
		select(next);
		// Selection follows focus: move focus to the radio that just applied.
		groupRef.current
			?.querySelector<HTMLButtonElement>(`button[data-value="${next.value}"]`)
			?.focus();
	};

	const reason = options.find((option) => option.disabled && option.disabledReason)?.disabledReason;

	return (
		<div className={cn("min-w-0", className)}>
			<div
				ref={groupRef}
				role="radiogroup"
				aria-label={label}
				onKeyDown={onKeyDown}
				className="flex w-full gap-1 rounded-full border border-line bg-canvas p-1"
			>
				<LayoutGroup id={`${name}-${layoutId}`}>
					{options.map((option) => {
						const selected = option.value === value;
						return (
							<button
								key={option.value}
								type="button"
								role="radio"
								data-value={option.value}
								aria-checked={selected}
								tabIndex={selected ? 0 : -1}
								disabled={disabled || option.disabled}
								onClick={() => select(option)}
								className={cn(
									"relative isolate inline-flex min-h-control flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50",
									selected ? "text-bg" : "text-muted transition-ui pressable hover:text-ink",
								)}
							>
								{selected ? (
									<motion.span
										layoutId="segmented-pill"
										aria-hidden="true"
										className="absolute inset-0 -z-10 rounded-full bg-ink"
										transition={SPRING_INDICATOR}
									/>
								) : null}
								{option.dotClass ? (
									<span
										aria-hidden="true"
										className={cn(adminStatusDot, "size-1.5", option.dotClass)}
									/>
								) : null}
								<span className="truncate">{option.label}</span>
							</button>
						);
					})}
				</LayoutGroup>
			</div>
			{helper || reason ? <p className={cn(adminHelp, "mt-1")}>{helper ?? reason}</p> : null}
		</div>
	);
}

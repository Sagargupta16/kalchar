"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { SPRING_ZOOM } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Preset chip group for the custom-order form (visual-direction 2.8,
 * forms-copy c1). One fieldset per question, one radio per chip, the first
 * chip an explicit neutral with the empty value (matching the old select's
 * default), never a pre-checked priced chip. Pills at the 44px floor with a
 * 14px/500 label (the 16px floor is for text inputs, which trigger iOS zoom;
 * radios do not). Checked = section-accent border + accent/10 fill + ink text
 * + a 14px check entering on SPRING_ZOOM; focus lifts the global 2px outline
 * onto the pill via has-focus-visible (the radio itself is sr-only).
 *
 * Each group is a full-width row: wrapping needs the whole measure, so chip
 * groups never sit inside the form's @md two-column split.
 */

interface PresetChipsProps {
	/** FormData key (size / budget / timeline); the submit logic is unchanged. */
	name: string;
	/** The question, rendered as the legend. */
	label: string;
	/** First chip's label; its value is "" like the old select default. */
	neutralLabel: string;
	options: readonly string[];
	value: string;
	onChange: (value: string) => void;
}

export function getPresetOptions(
	options: readonly string[],
	neutralLabel: string,
	selected = "",
): string[] {
	const seen = new Set(["", neutralLabel.trim().toLowerCase()]);
	const selectedLabel = selected.trim();
	const selectedKey = selectedLabel.toLowerCase();
	const items: string[] = [];
	// Keep a restored preference visible even if the studio has changed its presets.
	for (const option of [...options, selected]) {
		const label = option.trim();
		const key = label.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		items.push(key === selectedKey ? selectedLabel : label);
	}
	return items;
}

export function PresetChips({
	name,
	label,
	neutralLabel,
	options,
	value,
	onChange,
}: Readonly<PresetChipsProps>) {
	const items = getPresetOptions(options, neutralLabel, value);

	return (
		<fieldset>
			<legend className="flex w-full flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium text-ink">
				<span>{label}</span>
				<span className="text-xs text-muted">optional</span>
			</legend>
			<div className="mt-(--field-label-gap) flex flex-wrap gap-2">
				<Chip
					name={name}
					value=""
					label={neutralLabel}
					checked={value === ""}
					onSelect={onChange}
				/>
				{items.map((option) => (
					<Chip
						key={option}
						name={name}
						value={option}
						label={option}
						checked={value === option}
						onSelect={onChange}
					/>
				))}
			</div>
		</fieldset>
	);
}

function Chip({
	name,
	value,
	label,
	checked,
	onSelect,
}: Readonly<{
	name: string;
	value: string;
	label: string;
	checked: boolean;
	onSelect: (value: string) => void;
}>) {
	return (
		<label
			className={cn(
				"inline-flex min-h-control max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-ink transition-ui pressable has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2",
				checked
					? "border-(--section-accent) bg-(--section-accent)/10"
					: "border-line-strong bg-canvas hover:border-(--section-accent)/50",
			)}
		>
			<input
				type="radio"
				name={name}
				value={value}
				checked={checked}
				onChange={() => onSelect(value)}
				className="sr-only"
			/>
			{checked ? (
				<motion.span
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={SPRING_ZOOM}
					className="flex shrink-0 text-(--section-accent)"
					aria-hidden="true"
				>
					<Check size={14} />
				</motion.span>
			) : null}
			<span className="min-w-0 break-words">{label}</span>
		</label>
	);
}

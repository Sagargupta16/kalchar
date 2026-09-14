"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
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
}

export function PresetChips({ name, label, neutralLabel, options }: Readonly<PresetChipsProps>) {
	const [selected, setSelected] = useState("");
	// The neutral chip already carries the empty value; a data label that
	// duplicates it (site.json budgets end in "Open / not sure") renders once
	// so the same words never appear as two chips.
	const items = options.filter(
		(option) => option.trim().toLowerCase() !== neutralLabel.toLowerCase(),
	);

	return (
		<fieldset>
			<legend className="flex w-full items-baseline justify-between text-sm font-medium text-ink">
				<span>{label}</span>
				<span className="text-xs text-muted">optional</span>
			</legend>
			<div className="mt-(--field-label-gap) flex flex-wrap gap-2">
				<Chip
					name={name}
					value=""
					label={neutralLabel}
					checked={selected === ""}
					onSelect={setSelected}
				/>
				{items.map((option) => (
					<Chip
						key={option}
						name={name}
						value={option}
						label={option}
						checked={selected === option}
						onSelect={setSelected}
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
				"inline-flex min-h-control cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-ink transition-ui pressable has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2",
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
			{label}
		</label>
	);
}

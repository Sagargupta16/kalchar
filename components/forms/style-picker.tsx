"use client";

import { Brush, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { ArtImage } from "@/components/gallery/art-image";
import type { ArtStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface StyleSample {
	slug: string;
	image: string;
}

interface StylePickerProps {
	name: string;
	styles: readonly ArtStyle[];
	/** style -> representative artwork thumbnail. Missing = brush-glyph plate. */
	samples: Record<string, StyleSample>;
}

const OPEN = "" as const;

/**
 * Visual single-choice style picker for the custom-order form.
 *
 * Rendered as an accessible radio group: each option is a styled <label>
 * wrapping a visually-hidden <input type="radio">, so arrow keys navigate,
 * there's one tab stop, and the chosen value lands in the form's FormData
 * under `name` (the submit logic is unchanged). The first card is an
 * "Open to suggestion" option (empty value), matching the old <select>
 * default. Styles with a catalog thumbnail show the art; the rest fall back
 * to a brush glyph plate (the name already prints in the label).
 */
export function StylePicker({ name, styles, samples }: Readonly<StylePickerProps>) {
	const [selected, setSelected] = useState<string>(OPEN);

	return (
		<fieldset>
			<legend className="flex items-baseline justify-between text-sm font-medium text-ink">
				<span>Preferred style</span>
				<span className="text-xs text-muted">optional</span>
			</legend>
			<div
				role="radiogroup"
				aria-label="Preferred style"
				className="mt-(--field-label-gap) grid grid-cols-2 gap-3 sm:grid-cols-3"
			>
				{/* Open to suggestion */}
				<OptionCard
					name={name}
					value={OPEN}
					label="Open to suggestion"
					checked={selected === OPEN}
					onSelect={setSelected}
				>
					<div className="flex h-full w-full items-center justify-center bg-canvas text-(--section-accent)">
						<Sparkles size={22} aria-hidden="true" />
					</div>
				</OptionCard>

				{styles.map((style) => {
					const sample = samples[style];
					return (
						<OptionCard
							key={style}
							name={name}
							value={style}
							label={style}
							checked={selected === style}
							onSelect={setSelected}
						>
							{sample ? (
								<ArtImage
									src={`/artworks/${sample.image}`}
									alt=""
									sizes="(min-width: 640px) 16vw, 40vw"
									maxWidth={400}
									className="absolute inset-0 h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-canvas text-(--section-accent)">
									<Brush size={22} aria-hidden="true" />
								</div>
							)}
						</OptionCard>
					);
				})}
			</div>
		</fieldset>
	);
}

function OptionCard({
	name,
	value,
	label,
	checked,
	onSelect,
	children,
}: Readonly<{
	name: string;
	value: string;
	label: string;
	checked: boolean;
	onSelect: (value: string) => void;
	children: React.ReactNode;
}>) {
	return (
		// The radio is sr-only, so the global :focus-visible outline would land on a
		// 1px element; has-focus-visible lifts the same 2px outline onto the card.
		<label
			className={cn(
				"group relative cursor-pointer overflow-hidden rounded-(--radius-md) border bg-surface transition-ui has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2",
				checked
					? "border-(--section-accent) shadow-e2"
					: "border-line hover:border-(--section-accent)/50 hover:shadow-e1",
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
			{/* Thumbnail / icon plate */}
			<div className="relative aspect-4/3 overflow-hidden">
				{children}
				{/* Selected check */}
				<span
					className={cn(
						"absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-(--section-accent) text-bg transition-opacity",
						checked ? "opacity-100" : "opacity-0",
					)}
					aria-hidden="true"
				>
					<Check size={12} />
				</span>
			</div>
			{/* Label */}
			<span
				className={cn(
					"block px-3 py-2 text-sm font-medium transition-colors",
					checked ? "text-(--section-accent)" : "text-ink",
				)}
			>
				{label}
			</span>
		</label>
	);
}

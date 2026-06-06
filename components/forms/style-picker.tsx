"use client";

import { Check, Sparkles } from "lucide-react";
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
	/** style -> representative artwork thumbnail. Missing = text-only chip. */
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
 * to a text chip.
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
				className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3"
			>
				{/* Open to suggestion */}
				<OptionCard
					name={name}
					value={OPEN}
					label="Open to suggestion"
					checked={selected === OPEN}
					onSelect={setSelected}
				>
					<div className="flex h-full w-full items-center justify-center bg-bg-soft text-(--section-accent)">
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
								<div className="flex h-full w-full items-center justify-center bg-bg-soft">
									<span className="t-display text-lg text-muted">{style}</span>
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
		<label
			className={cn(
				"group relative cursor-pointer overflow-hidden rounded-(--radius-md) border bg-bg transition-all duration-(--duration-base) ease-(--ease-out) focus-within:ring-2 focus-within:ring-(--section-accent) focus-within:ring-offset-2 focus-within:ring-offset-bg",
				checked
					? "border-(--section-accent) shadow-md"
					: "border-line hover:border-(--section-accent)/50 hover:shadow-sm",
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
						"absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-(--section-accent) text-bg transition-opacity duration-(--duration-fast)",
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
					"block px-2.5 py-2 text-xs font-medium transition-colors",
					checked ? "text-(--section-accent)" : "text-ink",
				)}
			>
				{label}
			</span>
		</label>
	);
}

"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { AdminSwitch } from "./admin-switch";
import { ArtworkEditPhoto } from "./artwork-edit-photo";
import type { ArtworkEditorFields, FieldErrors } from "./artwork-edit-state";
import { artworkStatusHelper, useArtworkStatusOptions } from "./artwork-quick-state";
import {
	adminBtn,
	adminBtnDestructive,
	adminError,
	adminField,
	adminHelp,
	adminLabel,
	ICON_MD,
} from "./controls";
import { Segmented } from "./segmented";
import type { UploadProgressState } from "./upload-progress";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** The title uses the same field boundary as the rest of the form. */
const TITLE_FIELD = cn(adminField, "text-xl font-medium");

interface ArtworkEditFieldsProps {
	art: Artwork;
	thumb: string;
	categories: readonly string[];
	fields: ArtworkEditorFields;
	errors: FieldErrors;
	pending: boolean;
	progress: UploadProgressState | null;
	replacement: File | null;
	onReplacementChange: (file: File | null) => void;
	onChange: (patch: Partial<ArtworkEditorFields>) => void;
	onRefreshPalette: () => void;
	/** Resolves true when the new photo was written; the picker then clears. */
	onReplace: (file: File) => Promise<boolean>;
	onRequestDelete: () => void;
}

/**
 * The editor body (Tier 1d), top to bottom: photo hero (whole painting),
 * status, featured switch, details and the delete block. All fields share Save.
 */
export function ArtworkEditFields({
	art,
	thumb,
	categories,
	fields,
	errors,
	pending,
	progress,
	replacement,
	onReplacementChange,
	onChange,
	onRefreshPalette,
	onReplace,
	onRequestDelete,
}: Readonly<ArtworkEditFieldsProps>) {
	const id = useId();
	const [detailsOpen, setDetailsOpen] = useState(
		fields.year !== "" || fields.dimensions !== "" || fields.description !== "",
	);
	const styleOptions = categories.includes(art.style) ? categories : [art.style, ...categories];
	// The editor can clear the price with the status, unlike a row shortcut.
	const statusOptions = useArtworkStatusOptions(null);
	const priceDigits = fields.price !== "" && /^\d+$/.test(fields.price);

	return (
		<div className="grid items-start lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8">
			<div className="lg:sticky lg:top-0">
				<ArtworkEditPhoto
					art={art}
					thumb={thumb}
					pending={pending}
					progress={progress}
					replacement={replacement}
					onReplacementChange={onReplacementChange}
					onRefreshPalette={onRefreshPalette}
					onReplace={onReplace}
				/>
			</div>

			<div className="min-w-0">
				<div className="mt-(--space-group) grid gap-2 lg:mt-0">
					<Segmented
						name={`edit-${art.slug}`}
						label={`Status of ${art.title}`}
						value={fields.status}
						options={statusOptions}
						disabled={pending}
						helper={artworkStatusHelper(fields.status)}
						onChange={(status) =>
							onChange(status === "archive" ? { status, price: "" } : { status })
						}
					/>
					<div className="flex min-h-control items-center justify-between gap-3">
						<label htmlFor={`${id}-featured`} className="min-w-0">
							<span className="block text-sm font-medium text-ink">Featured on home</span>
							<span className={adminHelp}>Highlights this piece at the top of the home page.</span>
						</label>
						<AdminSwitch
							id={`${id}-featured`}
							checked={fields.featured}
							disabled={pending}
							onChange={(featured) => onChange({ featured })}
							label="Featured on home"
						/>
					</div>
				</div>

				<p className={cn(adminHelp, "mt-(--form-group-gap)")}>Fields marked * are required.</p>
				<fieldset
					disabled={pending}
					className="mt-(--form-gap) grid gap-(--form-gap) sm:grid-cols-2"
				>
					<legend className="sr-only">Details</legend>
					<div className={cn(adminLabel, "sm:col-span-2")}>
						<label htmlFor={`${id}-title`}>Title *</label>
						<input
							id={`${id}-title`}
							value={fields.title}
							onChange={(e) => onChange({ title: e.target.value })}
							autoCorrect="off"
							aria-required="true"
							aria-invalid={errors.title ? true : undefined}
							aria-describedby={errors.title ? `${id}-title-error` : undefined}
							className={TITLE_FIELD}
						/>
						{errors.title ? (
							<p id={`${id}-title-error`} className={adminError}>
								{errors.title}
							</p>
						) : null}
					</div>
					<div className={cn(adminLabel, "sm:col-span-2")}>
						<span>Category *</span>
						<div
							role="group"
							aria-label="Category"
							aria-invalid={errors.style ? true : undefined}
							aria-describedby={errors.style ? `${id}-category-error` : undefined}
							tabIndex={-1}
							className="flex flex-wrap gap-2"
						>
							{styleOptions.map((name) => (
								<button
									key={name}
									type="button"
									aria-pressed={fields.style === name}
									onClick={() => onChange({ style: name })}
									className={cn(adminBtn, "rounded-full")}
								>
									{name}
								</button>
							))}
						</div>
						{errors.style ? (
							<p id={`${id}-category-error`} className={adminError}>
								{errors.style}
							</p>
						) : null}
					</div>
					<div className={adminLabel}>
						<label htmlFor={`${id}-medium`}>Medium *</label>
						<input
							id={`${id}-medium`}
							value={fields.medium}
							onChange={(e) => onChange({ medium: e.target.value })}
							autoCorrect="off"
							aria-required="true"
							aria-invalid={errors.medium ? true : undefined}
							aria-describedby={errors.medium ? `${id}-medium-error` : undefined}
							className={adminField}
						/>
						{errors.medium ? (
							<p id={`${id}-medium-error`} className={adminError}>
								{errors.medium}
							</p>
						) : null}
					</div>
					<div className={adminLabel}>
						<label htmlFor={`${id}-price`}>Price in INR (optional)</label>
						<input
							id={`${id}-price`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={fields.price}
							onChange={(e) => {
								const price = digitsOnly(e.target.value);
								onChange({
									price,
									status: price && fields.status === "archive" ? "available" : fields.status,
								});
							}}
							aria-invalid={errors.price ? true : undefined}
							aria-describedby={`${id}-price-help`}
							className={adminField}
						/>
						<p id={`${id}-price-help`} className={errors.price ? adminError : adminHelp}>
							{errors.price ?? "Whole rupees. Leave blank if it is not for sale."}
							{!errors.price && priceDigits ? (
								<span
									key={fields.price}
									className="block tabular-nums starting:opacity-0 transition-opacity duration-(--duration-fast)"
								>
									Shows as {formatInr(Number(fields.price))}
								</span>
							) : null}
						</p>
					</div>
				</fieldset>

				<fieldset disabled={pending} className="mt-(--form-gap)">
					<legend className="sr-only">More details</legend>
					<details
						open={detailsOpen}
						onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
						className="group"
					>
						<summary className={cn(adminBtn, "w-full list-none justify-between")}>
							More details (Year, Dimensions, Description)
							<ChevronDown
								size={ICON_MD}
								aria-hidden="true"
								className="transition-transform duration-(--duration-fast) ease-(--ease-out) group-open:rotate-180"
							/>
						</summary>
						<div className="mt-3 grid gap-(--form-gap) sm:grid-cols-2">
							<div className={adminLabel}>
								<label htmlFor={`${id}-year`}>Year (optional)</label>
								<input
									id={`${id}-year`}
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									maxLength={4}
									placeholder="e.g. 2026"
									value={fields.year}
									onChange={(e) => onChange({ year: digitsOnly(e.target.value) })}
									aria-invalid={errors.year ? true : undefined}
									aria-describedby={errors.year ? `${id}-year-error` : undefined}
									className={adminField}
								/>
								{errors.year ? (
									<p id={`${id}-year-error`} className={adminError}>
										{errors.year}
									</p>
								) : null}
							</div>
							<div className={adminLabel}>
								<label htmlFor={`${id}-dimensions`}>Dimensions (optional)</label>
								<input
									id={`${id}-dimensions`}
									value={fields.dimensions}
									onChange={(e) => onChange({ dimensions: e.target.value })}
									placeholder="e.g. 30 x 40 cm"
									className={adminField}
								/>
								<p className={adminHelp}>Width x height, e.g. 30 x 40 cm</p>
							</div>
							<div className={cn(adminLabel, "sm:col-span-2")}>
								<label htmlFor={`${id}-description`}>Description (optional)</label>
								<textarea
									id={`${id}-description`}
									rows={3}
									value={fields.description}
									onChange={(e) => onChange({ description: e.target.value })}
									className={adminField}
								/>
							</div>
						</div>
					</details>
				</fieldset>

				<fieldset
					disabled={pending}
					className="mt-(--form-group-gap) border-t border-line pt-(--form-group-gap)"
				>
					<legend className="sr-only">Delete</legend>
					<p className={adminHelp}>
						Deleting removes the piece from the site. Its photos stay in storage.
					</p>
					<button
						type="button"
						onClick={onRequestDelete}
						className={cn(adminBtnDestructive, "mt-3 w-full")}
					>
						Delete piece
					</button>
				</fieldset>
			</div>
		</div>
	);
}

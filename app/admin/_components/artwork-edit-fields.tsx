"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { AdminSwitch } from "./admin-switch";
import { ArtworkEditPhoto } from "./artwork-edit-photo";
import type { EditorFields, FieldErrors } from "./artwork-edit-state";
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

/** Borderless title (1.12, as Tier 1c): the underline is the field boundary. */
const TITLE_FIELD =
	"min-h-control w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 text-xl font-medium text-ink transition-ui placeholder:text-muted focus-visible:border-accent";

interface ArtworkEditFieldsProps {
	art: Artwork;
	thumb: string;
	categories: readonly string[];
	fields: EditorFields;
	errors: FieldErrors;
	pending: boolean;
	progress: UploadProgressState | null;
	/** A quick state (status, featured) in flight for this piece. */
	quickPending: boolean;
	/** The last quick state's failure, rendered beside the control it came from. */
	quickError: string | null;
	onChange: (patch: Partial<EditorFields>) => void;
	/** Applies immediately with optimistic UI + Undo, independent of Save (D37). */
	onSetStatus: (status: ArtworkStatus) => void;
	onSetFeatured: (featured: boolean) => void;
	onRefreshPalette: () => void;
	/** Resolves true when the new photo was written; the picker then clears. */
	onReplace: (file: File) => Promise<boolean>;
	onRequestDelete: () => void;
}

/**
 * The editor body (Tier 1d), top to bottom: photo hero (whole painting),
 * segmented status, featured switch (both apply at once with Undo, never
 * dirtying Save), then the fields and the delete block.
 */
export function ArtworkEditFields({
	art,
	thumb,
	categories,
	fields,
	errors,
	pending,
	progress,
	quickPending,
	quickError,
	onChange,
	onSetStatus,
	onSetFeatured,
	onRefreshPalette,
	onReplace,
	onRequestDelete,
}: Readonly<ArtworkEditFieldsProps>) {
	const id = useId();
	const [detailsOpen, setDetailsOpen] = useState(
		fields.year !== "" || fields.dimensions !== "" || fields.description !== "",
	);
	const styleOptions = categories.includes(art.style) ? categories : [art.style, ...categories];
	const status = art.status ?? "archive";
	const statusOptions = useArtworkStatusOptions(art.priceInr);
	const priceDigits = fields.price !== "" && /^\d+$/.test(fields.price);

	return (
		<>
			<ArtworkEditPhoto
				art={art}
				thumb={thumb}
				pending={pending}
				progress={progress}
				onRefreshPalette={onRefreshPalette}
				onReplace={onReplace}
			/>

			<div className="mt-(--space-group) grid gap-2">
				<Segmented
					name={`edit-${art.slug}`}
					label={`Status of ${art.title}`}
					value={status}
					options={statusOptions}
					disabled={quickPending}
					helper={artworkStatusHelper(status)}
					onChange={onSetStatus}
				/>
				<div className="flex min-h-control items-center justify-between gap-3">
					<label htmlFor={`${id}-featured`} className="min-w-0">
						<span className="block text-sm font-medium text-ink">Featured on home</span>
						<span className={adminHelp}>Shows in the home hero pool.</span>
					</label>
					<AdminSwitch
						id={`${id}-featured`}
						checked={art.featured}
						disabled={quickPending}
						onChange={onSetFeatured}
						label="Featured on home"
					/>
				</div>
				{quickError ? <AdminNotice variant="error">{quickError}</AdminNotice> : null}
			</div>

			<p className={cn(adminHelp, "mt-(--form-group-gap)")}>Fields marked * are required.</p>
			<fieldset disabled={pending} className="mt-4 grid gap-(--form-gap) sm:grid-cols-2">
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
					<div role="group" aria-label="Category" className="flex flex-wrap gap-2">
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
					{errors.style ? <p className={adminError}>{errors.style}</p> : null}
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
					<label htmlFor={`${id}-price`}>Price (optional)</label>
					<input
						id={`${id}-price`}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={fields.price}
						onChange={(e) => onChange({ price: digitsOnly(e.target.value) })}
						aria-invalid={errors.price ? true : undefined}
						aria-describedby={`${id}-price-help`}
						className={adminField}
					/>
					<p id={`${id}-price-help`} className={errors.price ? adminError : adminHelp}>
						{errors.price ?? "Whole rupees. Leave blank if it is not for sale."}
						{!errors.price && priceDigits ? (
							<span
								key={fields.price}
								className="block tabular-nums starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-fast)"
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
							className="transition-transform group-open:rotate-180"
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
		</>
	);
}

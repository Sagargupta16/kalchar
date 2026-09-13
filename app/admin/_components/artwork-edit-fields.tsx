"use client";

import { Star } from "lucide-react";
import { type ReactNode, useId } from "react";
import {
	ARTWORK_STATUS_OPTIONS,
	artworkStatusHelp,
	artworkStatusLabel,
	quickStateBlockedReason,
} from "@/lib/artwork-status";
import type { Artwork, ArtworkStatus } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { ArtworkEditPhoto } from "./artwork-edit-photo";
import type { EditorFields, FieldErrors } from "./artwork-edit-state";
import {
	adminBtn,
	adminBtnDestructive,
	adminError,
	adminField,
	adminHelp,
	adminLabel,
	adminSectionTitle,
	ICON_MD,
} from "./controls";
import type { UploadProgressState } from "./upload-progress";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

interface FieldProps {
	id: string;
	label: string;
	hint?: ReactNode;
	error?: string;
	className?: string;
	children: (describedBy: string | undefined) => ReactNode;
}

/** Label above, control, then hint or error on the same left edge (alignment rule 6). */
function Field({ id, label, hint, error, className, children }: Readonly<FieldProps>) {
	const hintId = `${id}-hint`;
	const text = error ?? hint;
	return (
		<div className={cn(adminLabel, className)}>
			<label htmlFor={id}>{label}</label>
			{children(text ? hintId : undefined)}
			{text ? (
				<p id={hintId} className={error ? adminError : adminHelp}>
					{text}
				</p>
			) : null}
		</div>
	);
}

const FIELDSET = "grid gap-(--form-gap) sm:grid-cols-2 [&+&]:mt-(--form-group-gap)";
const LEGEND = cn(adminSectionTitle, "mb-2 sm:col-span-2");

interface ArtworkEditFieldsProps {
	art: Artwork;
	thumb: string;
	categories: readonly string[];
	fields: EditorFields;
	errors: FieldErrors;
	pending: boolean;
	progress: UploadProgressState | null;
	onChange: (patch: Partial<EditorFields>) => void;
	onRefreshPalette: () => void;
	/** Resolves true when the new photo was written; the picker then clears. */
	onReplace: (file: File) => Promise<boolean>;
	onRequestDelete: () => void;
}

/** The editor body: Details, Price and status, Photo, then the delete block. */
export function ArtworkEditFields({
	art,
	thumb,
	categories,
	fields,
	errors,
	pending,
	progress,
	onChange,
	onRefreshPalette,
	onReplace,
	onRequestDelete,
}: Readonly<ArtworkEditFieldsProps>) {
	const id = useId();
	const styleOptions = categories.includes(art.style) ? categories : [art.style, ...categories];
	const priceDigits = fields.price !== "" && /^\d+$/.test(fields.price);
	const statusHint =
		fields.status === "archive" && fields.price !== ""
			? quickStateBlockedReason("archive", Number(fields.price))
			: artworkStatusHelp(fields.status);

	return (
		<>
			<p className={adminHelp}>Fields marked * are required.</p>
			<fieldset disabled={pending} className={cn(FIELDSET, "mt-4")}>
				<legend className={LEGEND}>Details</legend>
				<Field id={`${id}-title`} label="Title *" error={errors.title}>
					{(describedBy) => (
						<input
							id={`${id}-title`}
							value={fields.title}
							onChange={(e) => onChange({ title: e.target.value })}
							autoCorrect="off"
							aria-required="true"
							aria-invalid={errors.title ? true : undefined}
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
				<Field id={`${id}-style`} label="Category *" error={errors.style}>
					{(describedBy) => (
						<select
							id={`${id}-style`}
							value={fields.style}
							onChange={(e) => onChange({ style: e.target.value })}
							aria-required="true"
							aria-invalid={errors.style ? true : undefined}
							aria-describedby={describedBy}
							className={adminField}
						>
							{styleOptions.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					)}
				</Field>
				<Field id={`${id}-medium`} label="Medium *" error={errors.medium}>
					{(describedBy) => (
						<input
							id={`${id}-medium`}
							value={fields.medium}
							onChange={(e) => onChange({ medium: e.target.value })}
							autoCorrect="off"
							aria-required="true"
							aria-invalid={errors.medium ? true : undefined}
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
				<Field
					id={`${id}-dimensions`}
					label="Dimensions (optional)"
					hint="Width x height, e.g. 30 x 40 cm"
				>
					{(describedBy) => (
						<input
							id={`${id}-dimensions`}
							value={fields.dimensions}
							onChange={(e) => onChange({ dimensions: e.target.value })}
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
				<Field id={`${id}-year`} label="Year (optional)" error={errors.year}>
					{(describedBy) => (
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
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
				<Field id={`${id}-description`} label="Description (optional)" className="sm:col-span-2">
					{(describedBy) => (
						<textarea
							id={`${id}-description`}
							rows={3}
							value={fields.description}
							onChange={(e) => onChange({ description: e.target.value })}
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
			</fieldset>

			<fieldset disabled={pending} className={FIELDSET}>
				<legend className={LEGEND}>Price and status</legend>
				<Field
					id={`${id}-price`}
					label="Price (optional)"
					error={errors.price}
					hint={
						<>
							Whole rupees. Leave blank if it is not for sale.
							{priceDigits ? (
								<span className="block">Shows as {formatInr(Number(fields.price))}</span>
							) : null}
						</>
					}
				>
					{(describedBy) => (
						<input
							id={`${id}-price`}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={fields.price}
							onChange={(e) => onChange({ price: digitsOnly(e.target.value) })}
							aria-invalid={errors.price ? true : undefined}
							aria-describedby={describedBy}
							className={adminField}
						/>
					)}
				</Field>
				<Field id={`${id}-status`} label="Status" hint={statusHint}>
					{(describedBy) => (
						<select
							id={`${id}-status`}
							value={fields.status}
							onChange={(e) => onChange({ status: e.target.value as ArtworkStatus })}
							aria-describedby={describedBy}
							className={adminField}
						>
							{ARTWORK_STATUS_OPTIONS.map((status) => (
								<option key={status} value={status}>
									{artworkStatusLabel(status)}
								</option>
							))}
						</select>
					)}
				</Field>
				<Field id={`${id}-featured`} label="Featured" hint="Featured pieces lead the home page.">
					{(describedBy) => (
						<button
							id={`${id}-featured`}
							type="button"
							aria-pressed={fields.featured}
							aria-describedby={describedBy}
							onClick={() => onChange({ featured: !fields.featured })}
							className={cn(adminBtn, "w-full justify-start")}
						>
							<Star
								size={ICON_MD}
								aria-hidden="true"
								className={fields.featured ? "fill-current" : undefined}
							/>
							{fields.featured ? "Featured" : "Not featured"}
						</button>
					)}
				</Field>
			</fieldset>

			<ArtworkEditPhoto
				art={art}
				thumb={thumb}
				pending={pending}
				progress={progress}
				fieldsetClassName={FIELDSET}
				legendClassName={LEGEND}
				onRefreshPalette={onRefreshPalette}
				onReplace={onReplace}
			/>

			<fieldset
				disabled={pending}
				className="mt-(--form-group-gap) border-t border-line pt-(--form-group-gap)"
			>
				<p className={adminHelp}>
					Deleting removes the piece from the site. Its photos stay in storage.
				</p>
				<button
					type="button"
					onClick={onRequestDelete}
					className={cn(adminBtnDestructive, "mt-3 w-full sm:w-auto")}
				>
					Delete piece
				</button>
			</fieldset>
		</>
	);
}

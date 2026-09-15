"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn, formatInr } from "@/lib/utils";
import { adminBtn, adminError, adminField, adminHelp, adminLabel, ICON_MD } from "./controls";
import type { UploadComposerState } from "./use-upload-composer";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function UploadDetailsStep({
	composer,
	id,
}: Readonly<{ composer: UploadComposerState; id: string }>) {
	const { fields, errors, categories, suggestions, change, pending } = composer;
	const [detailsOpen, setDetailsOpen] = useState(
		!!(fields.year || fields.dimensions || fields.description),
	);
	return (
		<fieldset disabled={pending} className="grid min-w-0 gap-(--form-gap)">
			<legend className="sr-only">Piece details</legend>
			<p className={adminHelp}>Fields marked * are required.</p>
			<div className={adminLabel}>
				<label htmlFor={`${id}-title`}>Title *</label>
				<input
					id={`${id}-title`}
					name="title"
					value={fields.title}
					onChange={(event) => change({ title: event.target.value })}
					placeholder="e.g. Lotus garden"
					autoCorrect="off"
					required
					aria-invalid={!!errors.title}
					aria-describedby={errors.title ? `${id}-title-error` : undefined}
					className={cn(adminField, "text-xl font-medium")}
				/>
				{errors.title ? (
					<p id={`${id}-title-error`} className={adminError}>
						{errors.title}
					</p>
				) : null}
			</div>
			<div className={adminLabel}>
				<span id={`${id}-category-label`}>Category *</span>
				<div
					role="group"
					aria-label="Category"
					aria-invalid={!!errors.style}
					aria-describedby={errors.style ? `${id}-category-error` : undefined}
					tabIndex={-1}
					className="flex flex-wrap gap-2"
				>
					{categories.map((name) => (
						<button
							key={name}
							type="button"
							aria-pressed={fields.style === name}
							onClick={() => change({ style: name })}
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
				{categories.length === 0 ? (
					<p className={adminHelp}>
						No categories yet.{" "}
						<Link
							href="/admin/categories"
							className="underline underline-offset-2 hover:text-accent-text"
						>
							Add one in Categories
						</Link>{" "}
						first.
					</p>
				) : null}
			</div>
			<div className={adminLabel}>
				<label htmlFor={`${id}-medium`}>Medium *</label>
				<input
					id={`${id}-medium`}
					name="medium"
					list={`${id}-mediums`}
					value={fields.medium}
					onChange={(event) => change({ medium: event.target.value })}
					placeholder="e.g. Natural pigment on handmade paper"
					autoCorrect="off"
					required
					aria-invalid={!!errors.medium}
					aria-describedby={errors.medium ? `${id}-medium-error` : undefined}
					className={adminField}
				/>
				<datalist id={`${id}-mediums`}>
					{suggestions.mediums.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>
				{errors.medium ? (
					<p id={`${id}-medium-error`} className={adminError}>
						{errors.medium}
					</p>
				) : null}
			</div>
			<div className={adminLabel}>
				<label htmlFor={`${id}-price`}>Price (optional)</label>
				<div className={cn(adminField, "flex items-center gap-2")}>
					<span aria-hidden="true" className="text-sm text-muted">
						INR
					</span>
					<input
						id={`${id}-price`}
						name="priceInr"
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={fields.price}
						onChange={(event) => change({ price: digitsOnly(event.target.value) })}
						aria-invalid={!!errors.price}
						aria-describedby={`${id}-price-help${errors.price ? ` ${id}-price-error` : ""}`}
						className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink"
					/>
				</div>
				<p id={`${id}-price-help`} className={adminHelp}>
					Leave blank if it is not for sale. Otherwise, enter whole rupees.
					{fields.price ? (
						<span className="block tabular-nums">Shows as {formatInr(Number(fields.price))}</span>
					) : null}
				</p>
				{errors.price ? (
					<p id={`${id}-price-error`} className={adminError}>
						{errors.price}
					</p>
				) : null}
			</div>
			<details
				open={detailsOpen || !!errors.year}
				onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
				className="group"
			>
				<summary className={cn(adminBtn, "w-full list-none justify-between")}>
					More details
					<ChevronDown
						size={ICON_MD}
						aria-hidden="true"
						className="transition-transform duration-(--duration-fast) ease-(--ease-out) group-open:rotate-180"
					/>
				</summary>
				<div className="mt-(--form-gap) grid gap-(--form-gap)">
					<div className={adminLabel}>
						<label htmlFor={`${id}-year`}>Year (optional)</label>
						<input
							id={`${id}-year`}
							name="year"
							inputMode="numeric"
							maxLength={4}
							placeholder={`e.g. ${new Date().getFullYear()}`}
							value={fields.year}
							onChange={(event) => change({ year: digitsOnly(event.target.value) })}
							aria-invalid={!!errors.year}
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
							name="dimensions"
							list={`${id}-dimensions-list`}
							placeholder="e.g. 30 x 40 cm"
							value={fields.dimensions}
							onChange={(event) => change({ dimensions: event.target.value })}
							className={adminField}
						/>
						<datalist id={`${id}-dimensions-list`}>
							{suggestions.dimensions.map((value) => (
								<option key={value} value={value} />
							))}
						</datalist>
					</div>
					<div className={adminLabel}>
						<label htmlFor={`${id}-description`}>Description (optional)</label>
						<textarea
							id={`${id}-description`}
							name="description"
							rows={3}
							value={fields.description}
							onChange={(event) => change({ description: event.target.value })}
							className={adminField}
						/>
					</div>
				</div>
			</details>
		</fieldset>
	);
}

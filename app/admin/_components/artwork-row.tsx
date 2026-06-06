"use client";

import { ImageUp, Palette, Pencil, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Artwork } from "@/lib/types";
import {
	deleteArtwork,
	regeneratePalette,
	replaceArtworkImage,
	setFeatured,
	setPrice,
	setStatus,
	updateArtworkMeta,
} from "../actions";
import { adminBtn, adminBtnDestructive, adminBtnPrimary, adminField } from "./controls";

export function ArtworkRow({
	art,
	thumb,
	categories,
}: Readonly<{ art: Artwork; thumb: string; categories: readonly string[] }>) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [price, setPriceInput] = useState(art.priceInr?.toString() ?? "");
	const [editing, setEditing] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	function run(fn: () => Promise<void>, after?: () => void) {
		setErr(null);
		startTransition(async () => {
			try {
				await fn();
				after?.();
				router.refresh();
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Failed.");
			}
		});
	}

	return (
		<div className="rounded-(--radius-sm) border border-line bg-bg transition-colors hover:border-line-soft">
			{/* Summary row */}
			<div className="flex flex-wrap items-center gap-3 p-3">
				{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
				<img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-(--radius-sm) object-cover" />
				<div className="min-w-36 flex-1">
					<p className="text-sm font-medium">{art.title}</p>
					<p className="text-xs text-muted">
						{art.style} · {art.status}
						{art.featured ? " · featured" : ""}
					</p>
					{art.palette && art.palette.length > 0 ? (
						<div className="mt-1 flex gap-0.5" aria-hidden="true">
							{art.palette.slice(0, 5).map((hex) => (
								<span
									key={hex}
									className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/10"
									style={{ backgroundColor: hex }}
								/>
							))}
						</div>
					) : (
						<p className="mt-1 text-[0.65rem] text-ruby">no palette</p>
					)}
				</div>

				<input
					type="number"
					min="0"
					value={price}
					onChange={(e) => setPriceInput(e.target.value)}
					placeholder="Price"
					className={`${adminField} w-24 px-2 py-1`}
				/>
				<button
					type="button"
					disabled={pending}
					onClick={() => run(() => setPrice(art.slug, price === "" ? null : Number(price)))}
					className={`${adminBtn} px-2 py-1`}
				>
					Save
				</button>

				<select
					value={art.status}
					disabled={pending}
					onChange={(e) =>
						run(() => setStatus(art.slug, e.target.value as "archive" | "available" | "sold"))
					}
					className={`${adminField} px-2 py-1`}
				>
					<option value="archive">archive</option>
					<option value="available">available</option>
					<option value="sold">sold</option>
				</select>

				<button
					type="button"
					disabled={pending}
					onClick={() => run(() => setFeatured(art.slug, !art.featured))}
					className={`${adminBtn} px-2 py-1 ${art.featured ? "border-accent text-accent" : ""}`}
					title={art.featured ? "Unfeature" : "Feature"}
				>
					<Star size={12} className={art.featured ? "fill-accent" : ""} />
				</button>

				<button
					type="button"
					disabled={pending}
					onClick={() => run(() => regeneratePalette(art.slug))}
					className={`${adminBtn} px-2 py-1`}
					title="Regenerate palette from image"
				>
					<Palette size={12} />
				</button>

				<button
					type="button"
					onClick={() => setEditing((v) => !v)}
					className={`${adminBtn} px-2 py-1 ${editing ? "border-accent text-accent" : ""}`}
					title="Edit details"
				>
					{editing ? <X size={12} /> : <Pencil size={12} />}
				</button>

				<button
					type="button"
					disabled={pending}
					onClick={() => {
						if (confirm(`Delete "${art.title}"? This cannot be undone.`)) {
							run(() => deleteArtwork(art.slug));
						}
					}}
					className={`${adminBtnDestructive} px-2 py-1`}
				>
					<Trash2 size={12} />
				</button>

				{err ? <span className="w-full text-xs text-ruby">{err}</span> : null}
			</div>

			{/* Edit panel */}
			{editing ? (
				<EditPanel
					art={art}
					categories={categories}
					pending={pending}
					onSaveMeta={(fields) => run(() => updateArtworkMeta(art.slug, fields))}
					onReplaceImage={(fd) => run(() => replaceArtworkImage(art.slug, fd))}
				/>
			) : null}
		</div>
	);
}

function EditPanel({
	art,
	categories,
	pending,
	onSaveMeta,
	onReplaceImage,
}: Readonly<{
	art: Artwork;
	categories: readonly string[];
	pending: boolean;
	onSaveMeta: (fields: {
		title: string;
		style: string;
		medium: string;
		dimensions: string | null;
		year: number | null;
		description: string | null;
	}) => void;
	onReplaceImage: (fd: FormData) => void;
}>) {
	const [title, setTitle] = useState(art.title);
	const [style, setStyle] = useState(art.style);
	const [medium, setMedium] = useState(art.medium);
	const [dimensions, setDimensions] = useState(art.dimensions ?? "");
	const [year, setYear] = useState(art.year?.toString() ?? "");
	const [description, setDescription] = useState(art.description ?? "");

	// The current category may not be in the list (e.g. renamed elsewhere);
	// include it so the select can still show it.
	const styleOptions = categories.includes(art.style) ? categories : [art.style, ...categories];

	return (
		<div className="space-y-4 border-t border-line bg-bg-soft p-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<Labeled label="Title">
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className={`${adminField} w-full`}
					/>
				</Labeled>
				<Labeled label="Category">
					<select
						value={style}
						onChange={(e) => setStyle(e.target.value)}
						className={`${adminField} w-full`}
					>
						{styleOptions.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</Labeled>
				<Labeled label="Medium">
					<input
						value={medium}
						onChange={(e) => setMedium(e.target.value)}
						className={`${adminField} w-full`}
					/>
				</Labeled>
				<Labeled label="Dimensions">
					<input
						value={dimensions}
						onChange={(e) => setDimensions(e.target.value)}
						placeholder="e.g. 30 x 40 cm"
						className={`${adminField} w-full`}
					/>
				</Labeled>
				<Labeled label="Year">
					<input
						type="number"
						value={year}
						onChange={(e) => setYear(e.target.value)}
						className={`${adminField} w-full`}
					/>
				</Labeled>
			</div>
			<Labeled label="Description">
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
					className={`${adminField} w-full`}
				/>
			</Labeled>

			<button
				type="button"
				disabled={pending}
				onClick={() => {
					const y = year ? Number(year) : null;
					onSaveMeta({
						title: title.trim(),
						style,
						medium: medium.trim(),
						dimensions: dimensions.trim() || null,
						year: y && !Number.isNaN(y) ? y : null,
						description: description.trim() || null,
					});
				}}
				className={adminBtnPrimary}
			>
				Save details
			</button>

			{/* Replace image */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onReplaceImage(new FormData(e.currentTarget));
				}}
				className="flex flex-wrap items-center gap-3 border-t border-line pt-4"
			>
				<label className="flex cursor-pointer items-center gap-2 text-xs text-muted transition-colors hover:text-accent">
					<ImageUp size={14} />
					<span>Replace image</span>
					<input
						name="image"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						required
						className="text-xs"
					/>
				</label>
				<button type="submit" disabled={pending} className={`${adminBtn} px-3 py-1.5`}>
					Upload new image
				</button>
				<p className="w-full text-[0.65rem] text-muted">
					Replaces the picture for this piece, regenerates variants + palette. Title, price, and
					everything else stay.
				</p>
			</form>
		</div>
	);
}

function Labeled({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
	// The control is nested inside the <label>, which is a valid implicit
	// association; Biome's rule expects htmlFor/id, so we opt out here.
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: control is nested as a child
		<label className="block text-xs text-muted">
			<span className="mb-1 block">{label}</span>
			{children}
		</label>
	);
}

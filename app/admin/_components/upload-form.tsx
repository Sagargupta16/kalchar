"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createArtwork } from "../actions";
import { adminBtnPrimary, adminField, adminLabel } from "./controls";

export function UploadForm({ categories }: Readonly<{ categories: readonly string[] }>) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setOk(null);
		const form = e.currentTarget;
		const data = new FormData(form);
		startTransition(async () => {
			try {
				const { slug } = await createArtwork(data);
				setOk(`Added "${slug}". Variants generated.`);
				form.reset();
				router.refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed.");
			}
		});
	}

	return (
		<form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
			<div className={adminLabel}>
				<label htmlFor="new-artwork-title">Title *</label>
				<input
					id="new-artwork-title"
					name="title"
					placeholder="e.g. Lotus garden"
					required
					className={adminField}
				/>
			</div>
			<div className={adminLabel}>
				<label htmlFor="new-artwork-category">Category *</label>
				<select
					id="new-artwork-category"
					name="style"
					required
					className={adminField}
					defaultValue=""
				>
					<option value="" disabled>
						Select a category
					</option>
					{categories.map((category) => (
						<option key={category} value={category}>
							{category}
						</option>
					))}
				</select>
			</div>
			<div className={adminLabel}>
				<label htmlFor="new-artwork-medium">Medium *</label>
				<input
					id="new-artwork-medium"
					name="medium"
					placeholder="e.g. Natural pigment on handmade paper"
					required
					className={adminField}
				/>
			</div>
			<div className={adminLabel}>
				<label htmlFor="new-artwork-dimensions">Dimensions</label>
				<input
					id="new-artwork-dimensions"
					name="dimensions"
					placeholder="e.g. 30 x 40 cm"
					className={adminField}
				/>
			</div>
			<div className={adminLabel}>
				<label htmlFor="new-artwork-price">Price (INR)</label>
				<input
					id="new-artwork-price"
					name="priceInr"
					type="number"
					min="0"
					placeholder="Blank keeps it archived"
					className={adminField}
				/>
			</div>
			<div className={adminLabel}>
				<label htmlFor="new-artwork-year">Year</label>
				<input
					id="new-artwork-year"
					name="year"
					type="number"
					placeholder="e.g. 2026"
					className={adminField}
				/>
			</div>
			<div className={`${adminLabel} sm:col-span-2`}>
				<label htmlFor="new-artwork-description">Description</label>
				<textarea
					id="new-artwork-description"
					name="description"
					placeholder="A short note about the piece"
					rows={3}
					className={adminField}
				/>
			</div>
			<div className="sm:col-span-2">
				<label className="flex cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-dashed border-line px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
					<ImagePlus size={18} aria-hidden="true" />
					<span>Choose image (JPG, PNG, or WebP)</span>
					<input
						name="image"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						required
						className="sr-only"
					/>
				</label>
			</div>
			<div className="mt-1 space-y-2 sm:col-span-2">
				<button type="submit" disabled={pending} className={`${adminBtnPrimary} w-full`}>
					{pending ? "Processing..." : "Add piece"}
				</button>
				{error ? <p className="text-sm text-ruby">{error}</p> : null}
				{ok ? <p className="text-sm text-accent">{ok}</p> : null}
			</div>
		</form>
	);
}

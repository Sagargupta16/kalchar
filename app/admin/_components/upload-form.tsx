"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createArtwork } from "../actions";
import { adminBtnPrimary, adminField } from "./controls";

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
			<input name="title" placeholder="Title *" required className={adminField} />
			<select name="style" required className={adminField} defaultValue="">
				<option value="" disabled>
					Category *
				</option>
				{categories.map((s) => (
					<option key={s} value={s}>
						{s}
					</option>
				))}
			</select>
			<input
				name="medium"
				placeholder="Medium * (e.g. Natural pigment on handmade paper)"
				required
				className={adminField}
			/>
			<input name="dimensions" placeholder="Dimensions (e.g. 30 x 40 cm)" className={adminField} />
			<input
				name="priceInr"
				type="number"
				min="0"
				placeholder="Price INR (blank = archive)"
				className={adminField}
			/>
			<input name="year" type="number" placeholder="Year" className={adminField} />
			<textarea
				name="description"
				placeholder="Description"
				rows={2}
				className={`${adminField} sm:col-span-2`}
			/>
			<div className="sm:col-span-2">
				<label className="flex cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-dashed border-line px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
					<ImagePlus size={18} />
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

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createArtwork } from "../actions";
import { adminBtnPrimary, adminField } from "./controls";

const STYLES = ["Madhubani", "Pichwai", "Lippan", "Gond", "Texture", "Mixed Media"];

export function UploadForm() {
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
				setOk(`Added "${slug}". Image variants generated and uploaded.`);
				form.reset();
				router.refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed.");
			}
		});
	}

	const field = adminField;

	return (
		<form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
			<input name="title" placeholder="Title *" required className={field} />
			<select name="style" required className={field} defaultValue="">
				<option value="" disabled>
					Style *
				</option>
				{STYLES.map((s) => (
					<option key={s} value={s}>
						{s}
					</option>
				))}
			</select>
			<input
				name="medium"
				placeholder="Medium * (e.g. Natural pigment on handmade paper)"
				required
				className={field}
			/>
			<input name="dimensions" placeholder="Dimensions (e.g. 30 x 40 cm)" className={field} />
			<input
				name="priceInr"
				type="number"
				min="0"
				placeholder="Price INR (blank = archive only)"
				className={field}
			/>
			<input name="year" type="number" placeholder="Year" className={field} />
			<textarea
				name="description"
				placeholder="Description"
				rows={2}
				className={`${field} sm:col-span-2`}
			/>
			<input
				name="image"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				required
				className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-bg-soft file:px-3 file:py-1.5 file:text-sm sm:col-span-2"
			/>
			<div className="flex items-center gap-3 sm:col-span-2">
				<button type="submit" disabled={pending} className={adminBtnPrimary}>
					{pending ? "Uploading and processing…" : "Add piece"}
				</button>
				{error ? <span className="text-sm text-ruby">{error}</span> : null}
				{ok ? <span className="text-sm text-pichwai">{ok}</span> : null}
			</div>
		</form>
	);
}

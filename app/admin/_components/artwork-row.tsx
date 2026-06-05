"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Artwork } from "@/lib/types";
import { deleteArtwork, setFeatured, setPrice, setStatus } from "../actions";
import { adminBtn, adminBtnDestructive, adminField } from "./controls";

export function ArtworkRow({ art, thumb }: Readonly<{ art: Artwork; thumb: string }>) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [price, setPriceInput] = useState(art.priceInr?.toString() ?? "");
	const [err, setErr] = useState<string | null>(null);

	function run(fn: () => Promise<void>) {
		setErr(null);
		startTransition(async () => {
			try {
				await fn();
				router.refresh();
			} catch (e) {
				setErr(e instanceof Error ? e.message : "Failed.");
			}
		});
	}

	// Dense variants of the shared admin controls -- a multi-control row needs a
	// tighter footprint than the upload form's full-size fields.
	const ctrl = `${adminField} px-2 py-1`;
	const btn = `${adminBtn} px-2 py-1`;

	return (
		<div className="flex flex-wrap items-center gap-3 rounded-md border border-line p-3">
			{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL, next/image not used in this project */}
			<img src={thumb} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
			<div className="min-w-40 flex-1">
				<p className="font-medium">{art.title}</p>
				<p className="text-xs text-muted">
					{art.style} · {art.status}
					{art.featured ? " · featured" : ""}
				</p>
			</div>

			<input
				type="number"
				min="0"
				value={price}
				onChange={(e) => setPriceInput(e.target.value)}
				placeholder="Price INR"
				className={`${ctrl} w-28`}
			/>
			<button
				type="button"
				disabled={pending}
				onClick={() => run(() => setPrice(art.slug, price === "" ? null : Number(price)))}
				className={btn}
			>
				Save price
			</button>

			<select
				value={art.status}
				disabled={pending}
				onChange={(e) =>
					run(() => setStatus(art.slug, e.target.value as "archive" | "available" | "sold"))
				}
				className={ctrl}
			>
				<option value="archive">archive</option>
				<option value="available">available</option>
				<option value="sold">sold</option>
			</select>

			<button
				type="button"
				disabled={pending}
				onClick={() => run(() => setFeatured(art.slug, !art.featured))}
				className={btn}
			>
				{art.featured ? "Unfeature" : "Feature"}
			</button>

			<button
				type="button"
				disabled={pending}
				onClick={() => {
					if (confirm(`Delete "${art.title}" and its images? This cannot be undone.`)) {
						run(() => deleteArtwork(art.slug));
					}
				}}
				className={`${adminBtnDestructive} px-2 py-1`}
			>
				Delete
			</button>

			{err ? <span className="w-full text-sm text-ruby">{err}</span> : null}
		</div>
	);
}

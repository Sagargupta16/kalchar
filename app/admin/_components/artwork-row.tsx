"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Artwork } from "@/lib/types";
import { deleteArtwork, setFeatured, setPrice, setStatus } from "../actions";

export function ArtworkRow({ art, thumb }: { art: Artwork; thumb: string }) {
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

	const ctrl =
		"rounded-md border border-line bg-bg px-2 py-1 text-sm focus:border-accent focus:outline-none";

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
				className={`${ctrl} hover:border-accent hover:text-accent`}
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
				className={`${ctrl} hover:border-accent hover:text-accent`}
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
				className="rounded-md border border-ruby/40 px-2 py-1 text-sm text-ruby transition-colors hover:bg-ruby hover:text-bg"
			>
				Delete
			</button>

			{err ? <span className="w-full text-sm text-ruby">{err}</span> : null}
		</div>
	);
}

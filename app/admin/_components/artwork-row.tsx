"use client";

import { Palette, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Artwork } from "@/lib/types";
import { deleteArtwork, regeneratePalette, setFeatured, setPrice, setStatus } from "../actions";
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

	return (
		<div className="flex flex-wrap items-center gap-3 rounded-(--radius-sm) border border-line bg-bg p-3 transition-colors hover:border-line-soft">
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
	);
}

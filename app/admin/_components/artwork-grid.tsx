"use client";

import { GripVertical, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn, formatInr } from "@/lib/utils";
import { deleteArtwork, reorderArtworks } from "../actions";
import { useConfirm } from "./confirm-dialog";
import { ReorderBar } from "./reorder-bar";
import { SAVED_BADGE_DURATION_MS } from "./use-admin-action";
import { useReorder } from "./use-reorder";

interface ArtworkItem {
	slug: string;
	title: string;
	style: string;
	status: string;
	featured: boolean;
	priceInr?: number | null;
	thumb: string;
}

export function ArtworkGrid({ artworks: initial }: Readonly<{ artworks: ArtworkItem[] }>) {
	const router = useRouter();
	const confirm = useConfirm();
	const [items, setItems] = useState(initial);
	// Baseline = the last server-known order. Reset returns to it; it also
	// shifts when we delete so a delete doesn't look like an "unsaved reorder".
	const [baseline, setBaseline] = useState(initial);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const { dragging, over, dragProps } = useReorder(items, setItems);

	const handleSave = () => {
		startTransition(async () => {
			await reorderArtworks(items.map((i) => i.slug));
			setBaseline(items);
			setSaved(true);
			router.refresh();
			setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		});
	};

	const handleReset = () => setItems(baseline);

	const handleDelete = async (art: ArtworkItem) => {
		const ok = await confirm({
			title: `Delete "${art.title}"?`,
			body: "This removes the piece and its images from the gallery. This can't be undone.",
			confirmLabel: "Delete",
		});
		if (!ok) return;
		// Optimistically drop it from both the visible list and the baseline so
		// the gallery order updates instantly and it doesn't read as an unsaved
		// reorder. The server delete + refresh follow.
		setItems((prev) => prev.filter((i) => i.slug !== art.slug));
		setBaseline((prev) => prev.filter((i) => i.slug !== art.slug));
		startTransition(async () => {
			await deleteArtwork(art.slug);
			router.refresh();
		});
	};

	const hasChanges = items.some((item, i) => item.slug !== baseline[i]?.slug);

	return (
		<>
			<ul className="space-y-2">
				{items.map((art, i) => (
					<li
						key={art.slug}
						{...dragProps(i)}
						className={cn(
							"flex items-center gap-3 rounded-(--radius-sm) border border-line bg-bg p-3 transition-all duration-(--duration-fast)",
							dragging === i && "opacity-50 scale-[0.98]",
							over === i && dragging !== i && "border-accent shadow-sm",
						)}
					>
						<span className="cursor-grab text-muted hover:text-ink active:cursor-grabbing">
							<GripVertical size={16} />
						</span>
						{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
						<img
							src={art.thumb}
							alt=""
							className="h-12 w-12 shrink-0 rounded-(--radius-sm) object-cover"
						/>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">{art.title}</p>
							<p className="text-xs text-muted">
								{art.style}
								{art.status !== "archive" ? ` · ${art.status}` : ""}
								{art.priceInr ? ` · ${formatInr(art.priceInr)}` : ""}
							</p>
						</div>
						{art.featured ? <Star size={14} className="shrink-0 fill-accent text-accent" /> : null}
						<span className="t-meta text-[0.65rem]">#{i + 1}</span>
						<button
							type="button"
							disabled={pending}
							onClick={() => handleDelete(art)}
							title={`Delete ${art.title}`}
							className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-sm) border border-ruby/30 text-ruby transition-colors hover:bg-ruby hover:text-bg"
						>
							<Trash2 size={13} />
						</button>
					</li>
				))}
			</ul>

			{hasChanges ? (
				<ReorderBar
					label="Gallery order changed"
					pending={pending}
					saved={saved}
					onSave={handleSave}
					onReset={handleReset}
				/>
			) : null}
		</>
	);
}

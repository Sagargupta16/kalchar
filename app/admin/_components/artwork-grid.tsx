"use client";

import { GripVertical, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { reorderArtworks } from "../actions";
import { adminBtn } from "./controls";

interface ArtworkItem {
	slug: string;
	title: string;
	style: string;
	status: string;
	featured: boolean;
	priceInr?: number | null;
	thumb: string;
}

interface Props {
	artworks: ArtworkItem[];
}

export function ArtworkGrid({ artworks: initial }: Readonly<Props>) {
	const router = useRouter();
	const [items, setItems] = useState(initial);
	const [dragging, setDragging] = useState<number | null>(null);
	const [over, setOver] = useState<number | null>(null);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const dragItem = useRef<number | null>(null);

	const handleDragStart = useCallback((index: number) => {
		dragItem.current = index;
		setDragging(index);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
		e.preventDefault();
		setOver(index);
	}, []);

	const handleDrop = useCallback(
		(index: number) => {
			const from = dragItem.current;
			if (from === null || from === index) {
				setDragging(null);
				setOver(null);
				return;
			}
			const updated = [...items];
			const moved = updated.splice(from, 1)[0];
			if (!moved) return;
			updated.splice(index, 0, moved);
			setItems(updated);
			setDragging(null);
			setOver(null);
		},
		[items],
	);

	const handleSave = () => {
		startTransition(async () => {
			await reorderArtworks(items.map((i) => i.slug));
			setSaved(true);
			router.refresh();
			setTimeout(() => setSaved(false), 2000);
		});
	};

	const hasChanges = items.some((item, i) => item.slug !== initial[i]?.slug);

	return (
		<>
			{hasChanges ? (
				<div className="mb-4 flex items-center gap-3">
					<button
						type="button"
						onClick={handleSave}
						disabled={pending}
						className={`${adminBtn} border-accent text-accent`}
					>
						{pending ? "Saving..." : "Save new order"}
					</button>
					{saved ? <span className="text-sm text-accent">Saved</span> : null}
				</div>
			) : null}

			<div role="list" className="space-y-2">
				{items.map((art, i) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop reorder
					<div
						role="listitem"
						key={art.slug}
						draggable
						onDragStart={() => handleDragStart(i)}
						onDragOver={(e) => handleDragOver(e, i)}
						onDrop={() => handleDrop(i)}
						onDragEnd={() => {
							setDragging(null);
							setOver(null);
						}}
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
								{art.priceInr ? ` · INR ${art.priceInr.toLocaleString("en-IN")}` : ""}
							</p>
						</div>
						{art.featured ? <Star size={14} className="shrink-0 fill-accent text-accent" /> : null}
						<span className="t-meta text-[0.65rem]">#{i + 1}</span>
					</div>
				))}
			</div>
		</>
	);
}

"use client";

import { MessageSquareQuote, Star, Trash2 } from "lucide-react";
import { useOptimistic } from "react";
import { Badge } from "@/components/ui/badge";
import type { ArtworkTitle } from "@/lib/data";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteTestimonial, setTestimonialFeatured } from "../testimonial-actions";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import {
	adminHelp,
	adminIconBtn,
	adminIconBtnDestructive,
	adminRow,
	adminThumb,
	ICON_MD,
} from "./controls";
import type { UndoOffer } from "./undo-bar";
import { useAdminAction } from "./use-admin-action";

export interface TestimonialRowProps {
	testimonial: Testimonial;
	/** The linked piece (title + image), resolved by the manager; never a raw slug. */
	artwork?: ArtworkTitle;
	highlighted?: boolean;
	onChanged: (next: Testimonial) => void;
	onDeleted: (id: string) => void;
	offerUndo: (offer: UndoOffer) => void;
}

/** Where this quote shows in public. Chips are read-only meta; the Star toggle is the tap target. */
function VisibilityBadge({
	featured,
	artworkTitle,
}: Readonly<{ featured: boolean; artworkTitle?: string }>) {
	if (featured) return <Badge variant="accent-soft">Home page</Badge>;
	if (artworkTitle) {
		return (
			<Badge variant="default" className="max-w-32 truncate">
				On {artworkTitle}
			</Badge>
		);
	}
	return <Badge variant="muted">Admin only</Badge>;
}

/**
 * The R6 row (D15) for one testimonial: the quote body with the linked piece's
 * thumbnail, one meta line (titles, never slugs), the Featured quick state, a
 * visibility chip, and Delete at the far end behind a hairline with at least
 * 16px clear space. The body stays a plain <div> (not a dead button) until the
 * updateTestimonial server action exists (spec 7.4); the inline editor lands
 * with it.
 */
export function TestimonialRow({
	testimonial: t,
	artwork,
	highlighted = false,
	onChanged,
	onDeleted,
	offerUndo,
}: Readonly<TestimonialRowProps>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	// Optimistic Feature (C12): flips the moment run starts, reverts by itself on failure.
	const [featured, setOptimisticFeatured] = useOptimistic(t.featured);

	const toggleFeatured = () =>
		run(
			() => {
				setOptimisticFeatured(!t.featured);
				return setTestimonialFeatured(t.id, !t.featured);
			},
			() => {
				onChanged({ ...t, featured: !t.featured });
				// The raw reverse action, never wrapped in run (the inFlight guard would no-op it).
				offerUndo({
					message: t.featured
						? `Testimonial from ${t.authorName} no longer featured`
						: `Testimonial from ${t.authorName} featured`,
					action: () => setTestimonialFeatured(t.id, t.featured),
				});
			},
		);

	const remove = async () => {
		const ok = await confirm({
			title: `Delete testimonial from ${t.authorName}?`,
			body: "The quote leaves the site permanently.",
			confirmLabel: "Delete testimonial",
			cancelLabel: "Keep testimonial",
		});
		if (ok)
			run(
				() => deleteTestimonial(t.id),
				() => onDeleted(t.id),
			);
	};

	return (
		<li
			id={`testimonial-${t.id}`}
			className={cn(
				adminRow,
				"@container/row scroll-mt-(--header-h-shrunk)",
				highlighted && "border-accent",
			)}
		>
			<div className="flex flex-col gap-4 @xl/row:flex-row @xl/row:items-start @xl/row:gap-3">
				{/* Line 1: the body (a <button> with aria-expanded once updateTestimonial exists). */}
				<div className="flex min-w-0 flex-1 items-start gap-3">
					{artwork ? (
						// biome-ignore lint/performance/noImgElement: admin-only thumb
						<img
							src={artworkBrowserImageUrl(artwork.image, 400, "webp")}
							alt=""
							className={cn(adminThumb, "size-12")}
						/>
					) : (
						<span className="grid size-12 shrink-0 place-items-center rounded-(--radius-sm) bg-canvas text-muted shadow-hairline">
							<MessageSquareQuote size={ICON_MD} aria-hidden="true" />
						</span>
					)}
					<span className="min-w-0 flex-1">
						<blockquote className="line-clamp-3 text-sm text-ink @xl/row:line-clamp-2">
							&ldquo;{t.quote}&rdquo;
						</blockquote>
						<span className={cn(adminHelp, "mt-1 block truncate")}>
							{t.authorName}
							{t.authorLocation ? `, ${t.authorLocation}` : ""}
							{artwork ? `, on ${artwork.title}` : ""}
						</span>
						<span className="sr-only">{featured ? ", featured on the home page" : ""}</span>
					</span>
				</div>
				{/* Line 2: quick state, visibility, divider, Delete */}
				<div className="flex items-center gap-2 @xl/row:shrink-0">
					<button
						type="button"
						disabled={pending}
						onClick={toggleFeatured}
						aria-pressed={featured}
						aria-label={`Feature testimonial from ${t.authorName} on the home page`}
						className={adminIconBtn}
					>
						<Star
							size={ICON_MD}
							aria-hidden="true"
							className={featured ? "fill-current" : undefined}
						/>
					</button>
					<VisibilityBadge featured={featured} artworkTitle={artwork?.title} />
					<div className="ml-auto flex items-center border-l border-line pl-4 @xl/row:ml-4">
						<button
							type="button"
							disabled={pending}
							onClick={remove}
							aria-label={`Delete testimonial from ${t.authorName}`}
							className={adminIconBtnDestructive}
						>
							<Trash2 size={ICON_MD} aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>
			{err ? (
				<AdminNotice variant="error" className="mt-3">
					{err}
				</AdminNotice>
			) : null}
		</li>
	);
}

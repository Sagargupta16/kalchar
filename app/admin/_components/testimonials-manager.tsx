"use client";

import { ExternalLink, LoaderCircle, MessageSquareQuote, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import type { ArtworkTitle } from "@/lib/data";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createTestimonial } from "../testimonial-actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { AdminSwitch } from "./admin-switch";
import {
	adminBtn,
	adminBtnPrimary,
	adminField,
	adminHelp,
	adminLabel,
	adminPanelInset,
	ICON_LG,
	ICON_MD,
	ICON_SM,
} from "./controls";
import { TestimonialRow } from "./testimonial-row";
import { UndoBar, useUndo } from "./undo-bar";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useServerSyncedList } from "./use-server-synced-list";

interface CreatedTestimonial {
	id: string;
	author: string;
	featured: boolean;
	artworkSlug: string | null;
}

/**
 * Admin CRUD for testimonials: a collapsed create panel, then a list where
 * each row can be featured (shown on home) or deleted. The picker and the row
 * meta show piece titles, never slugs; the form value stays the slug.
 */
export function TestimonialsManager({
	testimonials: initial,
	artworks,
}: Readonly<{ testimonials: Testimonial[]; artworks: readonly ArtworkTitle[] }>) {
	const createAction = useAdminAction();
	const { run: undoRun } = useAdminAction();
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(undoRun);
	const reduceMotion = usePrefersReducedMotion();
	const headingId = useId();
	const [creating, setCreating] = useState(false);
	const [created, setCreated] = useState<CreatedTestimonial | null>(null);
	const createdRef = useRef<CreatedTestimonial | null>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	const [items, setItems] = useServerSyncedList(initial, () => {
		if (createdRef.current) setArrivedId(createdRef.current.id);
	});

	const artworkBySlug = new Map(artworks.map((a) => [a.slug, a]));

	// Scroll the just-created row into view and highlight it while the timer runs (C13).
	useEffect(() => {
		if (!arrivedId) return;
		requestAnimationFrame(() => {
			document
				.getElementById(`testimonial-${arrivedId}`)
				?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [arrivedId, reduceMotion]);

	const openPanel = () => {
		setCreated(null);
		createdRef.current = null;
		setCreating(true);
	};

	const handleCreate = (fd: FormData, reset: () => void) => {
		setCreated(null);
		createdRef.current = null;
		const author = String(fd.get("authorName") ?? "").trim();
		const featured = fd.get("featured") != null;
		const artworkSlug = String(fd.get("artworkSlug") ?? "").trim() || null;
		let createdId: string | null = null;
		createAction.run(
			() =>
				createTestimonial(fd).then((result) => {
					if (!isFailure(result)) createdId = result.id;
					return result;
				}),
			() => {
				reset();
				setCreating(false);
				if (createdId) {
					const next = { id: createdId, author, featured, artworkSlug };
					setCreated(next);
					createdRef.current = next;
				}
			},
		);
	};

	const createdHref = created?.featured
		? "/"
		: created?.artworkSlug
			? `/work/${created.artworkSlug}`
			: null;

	return (
		<div className="space-y-group">
			{/* Ruling 42 + Tier 2d: the create panel spans 4 of 12 columns beside the 8-column list from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-12 lg:items-start">
				<div className="min-w-0 space-y-group lg:col-span-4">
					{creating ? (
						<CreateTestimonialForm
							pending={createAction.pending}
							pendingVisible={createAction.pendingVisible}
							err={createAction.err}
							artworks={artworks}
							onCancel={() => setCreating(false)}
							onCreate={handleCreate}
						/>
					) : (
						<button
							type="button"
							onClick={openPanel}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							<Plus size={ICON_MD} aria-hidden="true" />
							Add testimonial
						</button>
					)}
					{created ? (
						<AdminNotice variant="success">
							<span className="min-w-0">
								Testimonial from {created.author} added.
								{createdHref === null
									? " It is not shown in public yet: feature it or link it to a piece."
									: " "}
								{createdHref ? (
									<Link
										href={createdHref}
										className="underline underline-offset-2 hover:text-accent-text"
									>
										View on site
										<ExternalLink
											size={ICON_SM}
											aria-hidden="true"
											className="ml-1 inline-block align-[-2px]"
										/>
									</Link>
								) : null}
							</span>
						</AdminNotice>
					) : null}
				</div>

				<section aria-labelledby={headingId} className="min-w-0 lg:col-span-8">
					<AdminPanelHeader
						as="h2"
						id={headingId}
						title={`All testimonials (${items.length})`}
						description="A testimonial shows in public only when it is featured or linked to a piece."
					/>
					<ul aria-labelledby={headingId} className="space-y-tight">
						{items.map((t) => (
							<TestimonialRow
								key={t.id}
								testimonial={t}
								artwork={artworkBySlug.get(t.artworkSlug ?? "")}
								highlighted={t.id === arrivedId}
								onChanged={(next) =>
									setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)))
								}
								onDeleted={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
								offerUndo={offerUndo}
							/>
						))}
						{items.length === 0 ? (
							<EmptyState
								as="li"
								variant="compact"
								voice="tool"
								icon={<MessageSquareQuote size={ICON_LG} aria-hidden="true" />}
								title="No testimonials yet"
								body="Add one, then feature it or link it to a piece to show it in public."
								action={
									creating ? null : (
										<button type="button" onClick={openPanel} className={adminBtn}>
											Add testimonial
										</button>
									)
								}
							/>
						) : null}
					</ul>
				</section>
			</div>

			{undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError}
					onAction={undoNow}
					onDismiss={dismissUndo}
				/>
			) : null}
		</div>
	);
}

function CreateTestimonialForm({
	pending,
	pendingVisible,
	err,
	artworks,
	onCancel,
	onCreate,
}: Readonly<{
	pending: boolean;
	pendingVisible: boolean;
	err: string | null;
	artworks: readonly ArtworkTitle[];
	onCancel: () => void;
	onCreate: (fd: FormData, reset: () => void) => void;
}>) {
	const headingId = useId();
	const switchId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [featured, setFeatured] = useState(false);

	const cancel = () => {
		formRef.current?.reset();
		setFeatured(false);
		onCancel();
	};

	return (
		<form
			ref={formRef}
			aria-labelledby={headingId}
			onSubmit={(e) => {
				e.preventDefault();
				const form = e.currentTarget;
				onCreate(new FormData(form), () => {
					form.reset();
					setFeatured(false);
				});
			}}
			className={adminPanelInset}
		>
			<AdminPanelHeader
				id={headingId}
				title="Add a testimonial"
				description="A few words from a buyer or guest, with their name."
			/>
			<p className={adminHelp}>Fields marked * are required.</p>
			<div className="mt-4 grid gap-(--form-gap) sm:grid-cols-2">
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-testimonial-quote">Quote *</label>
					<textarea
						id="new-testimonial-quote"
						name="quote"
						required
						rows={3}
						// biome-ignore lint/a11y/noAutofocus: the panel opens on the user's own tap; focusing the first field is the point (C5)
						autoFocus
						placeholder="What they said"
						className={cn(adminField, "min-h-32 resize-y")}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-testimonial-author">Author name *</label>
					<input
						id="new-testimonial-author"
						name="authorName"
						required
						autoCapitalize="words"
						autoCorrect="off"
						placeholder="e.g. Priya"
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-testimonial-location">Location (optional)</label>
					<input
						id="new-testimonial-location"
						name="authorLocation"
						placeholder="e.g. Pune"
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-testimonial-artwork">Link to an artwork (optional)</label>
					<select
						id="new-testimonial-artwork"
						name="artworkSlug"
						defaultValue=""
						className={adminField}
					>
						<option value="">None</option>
						{artworks.map((a) => (
							<option key={a.slug} value={a.slug}>
								{a.title}
							</option>
						))}
					</select>
				</div>
				{/* The Featured switch row (visual-direction-admin 1.9, Tier 2d): the label and the
				    switch share one 44px hit target; a hidden input carries the form value. */}
				<label
					htmlFor={switchId}
					className="flex min-h-control cursor-pointer items-center justify-between gap-3 text-sm text-ink sm:col-span-2"
				>
					Feature on home page
					<AdminSwitch
						id={switchId}
						checked={featured}
						onChange={setFeatured}
						disabled={pending}
						label="Feature on home page"
					/>
					{featured ? <input type="hidden" name="featured" value="on" /> : null}
				</label>
			</div>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button type="button" disabled={pending} onClick={cancel} className={adminBtn}>
					Cancel
				</button>
				<button
					type="submit"
					disabled={pending}
					aria-busy={pending}
					className={cn(adminBtnPrimary, "w-full sm:w-auto")}
				>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add testimonial
				</button>
			</div>
			{err ? (
				<AdminNotice variant="error" className="mt-4">
					{err}
				</AdminNotice>
			) : null}
		</form>
	);
}

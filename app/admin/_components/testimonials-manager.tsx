"use client";

import { ExternalLink, LoaderCircle, MessageSquareQuote, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import type { ArtworkTitle } from "@/lib/data";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createTestimonial } from "../testimonial-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { AdminSwitch } from "./admin-switch";
import { useConfirm } from "./confirm-dialog";
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

/**
 * Admin CRUD for testimonials: a collapsed create panel, then a list where
 * each row can be featured (shown on home) or deleted. The picker and the row
 * meta show piece titles, never slugs; the form value stays the slug.
 */
export function TestimonialsManager({
	testimonials: initial,
	artworks,
}: Readonly<{ testimonials: Testimonial[]; artworks: readonly ArtworkTitle[] }>) {
	const { run: undoRun } = useAdminAction();
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(undoRun);
	const headingId = useId();
	const addRef = useRef<HTMLButtonElement>(null);
	const undoTarget = useRef<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [created, setCreated] = useState<Testimonial | null>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	const [items, setItems] = useServerSyncedList(initial);

	const artworkBySlug = new Map(artworks.map((a) => [a.slug, a]));

	// Scroll the just-created row into view and highlight it while the timer runs (C13).
	useEffect(() => {
		if (!arrivedId) return;
		const frame = requestAnimationFrame(() => {
			const row = document.getElementById(`testimonial-${arrivedId}`);
			row?.focus({ preventScroll: true });
			row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, [arrivedId]);

	const openPanel = () => {
		setCreated(null);
		setCreating(true);
	};

	const closePanel = () => {
		setCreating(false);
		requestAnimationFrame(() => addRef.current?.focus());
	};

	const handleCreated = (fields: Omit<Testimonial, "order">) => {
		const next = { ...fields, order: Math.max(0, ...items.map((item) => item.order)) + 1 };
		setItems((previous) =>
			previous.some((item) => item.id === next.id) ? previous : [...previous, next],
		);
		setCreated(next);
		setArrivedId(next.id);
		setCreating(false);
	};

	const handleDeleted = (id: string) => {
		const index = items.findIndex((item) => item.id === id);
		const next = items[index + 1] ?? items[index - 1];
		setItems((previous) => previous.filter((item) => item.id !== id));
		if (undoTarget.current === id) dismissUndo();
		requestAnimationFrame(() => {
			const target = next
				? document.getElementById(`testimonial-${next.id}`)
				: (document.getElementById("new-testimonial-quote") ?? addRef.current);
			target?.focus();
		});
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
							artworks={artworks}
							onCancel={closePanel}
							onCreate={handleCreated}
						/>
					) : (
						<button
							ref={addRef}
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
								Testimonial from {created.authorName} added.
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
								disabled={undoPending}
								onChanged={(next) =>
									setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)))
								}
								onDeleted={handleDeleted}
								offerUndo={(offer) => {
									undoTarget.current = t.id;
									offerUndo(offer);
								}}
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
	artworks,
	onCancel,
	onCreate,
}: Readonly<{
	artworks: readonly ArtworkTitle[];
	onCancel: () => void;
	onCreate: (testimonial: Omit<Testimonial, "order">) => void;
}>) {
	const { pending, pendingVisible, err, run } = useAdminAction();
	const confirm = useConfirm();
	const headingId = useId();
	const switchId = useId();
	const [featured, setFeatured] = useState(false);
	const [hasText, setHasText] = useState(false);
	const dirty = hasText || featured;
	useAdminDraftGuard(dirty || pending);

	const cancel = async () => {
		if (pending) return;
		if (
			dirty &&
			!(await confirm({
				title: "Discard testimonial?",
				body: "Your unsaved quote and author details will be lost.",
				confirmLabel: "Discard testimonial",
				cancelLabel: "Keep editing",
			}))
		)
			return;
		onCancel();
	};

	const submit = (form: HTMLFormElement) => {
		if (pending) return;
		for (const name of ["quote", "authorName"]) {
			const field = form.elements.namedItem(name);
			if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
				field.setCustomValidity(
					field.value.trim()
						? ""
						: name === "quote"
							? "Quote is required."
							: "Author name is required.",
				);
			}
		}
		if (!form.reportValidity()) return;
		const fd = new FormData(form);
		void run(async () => {
			const result = await createTestimonial(fd);
			if (!isFailure(result)) {
				onCreate({
					id: result.id,
					quote: String(fd.get("quote") ?? "").trim(),
					authorName: String(fd.get("authorName") ?? "").trim(),
					authorLocation: String(fd.get("authorLocation") ?? "").trim() || undefined,
					artworkSlug: String(fd.get("artworkSlug") ?? "").trim() || undefined,
					featured: fd.get("featured") === "on",
				});
			}
			return result;
		});
	};

	return (
		<form
			aria-labelledby={headingId}
			onSubmit={(e) => {
				e.preventDefault();
				submit(e.currentTarget);
			}}
			onChange={(event) => {
				const field = event.target;
				if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
					field.setCustomValidity("");
				}
				const data = new FormData(event.currentTarget);
				setHasText(
					["quote", "authorName", "authorLocation", "artworkSlug"].some(
						(name) => String(data.get(name) ?? "") !== "",
					),
				);
			}}
			className={cn(adminPanelInset, "@container/testimonial-form")}
		>
			<AdminPanelHeader
				id={headingId}
				title="Add a testimonial"
				description="A few words from a buyer or guest, with their name."
			/>
			<p className={adminHelp}>Fields marked * are required.</p>
			<fieldset
				disabled={pending}
				className="mt-(--form-gap) grid min-w-0 gap-(--form-gap) @sm/testimonial-form:grid-cols-2"
			>
				<div className={cn(adminLabel, "@sm/testimonial-form:col-span-2")}>
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
				<div className={cn(adminLabel, "@sm/testimonial-form:col-span-2")}>
					<label htmlFor="new-testimonial-artwork">Link to an artwork (optional)</label>
					<select
						id="new-testimonial-artwork"
						name="artworkSlug"
						defaultValue=""
						aria-describedby="new-testimonial-visibility"
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
					className="flex min-h-control cursor-pointer items-center justify-between gap-3 text-sm text-ink @sm/testimonial-form:col-span-2"
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
				<p
					id="new-testimonial-visibility"
					className={cn(adminHelp, "@sm/testimonial-form:col-span-2")}
				>
					Link a piece to show the quote on its artwork page. Feature it to show it on home. Leave
					both unset to keep it in admin only.
				</p>
			</fieldset>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 @sm/testimonial-form:flex-row @sm/testimonial-form:justify-end">
				<button type="button" disabled={pending} onClick={cancel} className={adminBtn}>
					Cancel
				</button>
				<button
					type="submit"
					disabled={pending}
					aria-busy={pending}
					className={cn(adminBtnPrimary, "w-full @sm/testimonial-form:w-auto")}
				>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add testimonial
				</button>
			</div>
			{err ? (
				<AdminNotice variant="error" className="mt-(--form-gap)">
					{err}
				</AdminNotice>
			) : null}
		</form>
	);
}

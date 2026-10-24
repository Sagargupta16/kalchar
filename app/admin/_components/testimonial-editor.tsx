"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ArtworkTitle } from "@/lib/data";
import {
	parseTestimonialDraft,
	TESTIMONIAL_LIMITS,
	type TestimonialDraft,
	type TestimonialDraftError,
} from "@/lib/testimonial-fields";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updateTestimonial } from "../testimonial-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminErrorNotice } from "./admin-error-notice";
import { AdminNotice } from "./admin-notice";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnPrimary, adminField, adminLabel, ICON_MD } from "./controls";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

const DRAFT_FIELDS = ["quote", "authorName", "authorLocation", "artworkSlug"] as const;

function draftOf(t: Pick<Testimonial, "quote" | "authorName" | "authorLocation" | "artworkSlug">) {
	return {
		quote: t.quote,
		authorName: t.authorName,
		authorLocation: t.authorLocation ?? "",
		artworkSlug: t.artworkSlug ?? "",
	} satisfies TestimonialDraft;
}

function sameDraft(a: TestimonialDraft, b: TestimonialDraft): boolean {
	return DRAFT_FIELDS.every((field) => a[field] === b[field]);
}

function focusField(form: HTMLFormElement | null, field: keyof TestimonialDraft) {
	const control = form?.elements.namedItem(field);
	if (control instanceof HTMLElement) control.focus();
}

/**
 * Inline edit state for one testimonial row (the workshop-row pattern): the
 * draft follows fresh props until the maintainer changes something, unsaved
 * edits are guarded on navigation and reload, and closing with a draft asks
 * before discarding. Featured stays on the row's star, not in the draft.
 */
export function useTestimonialEditor(
	testimonial: Testimonial,
	onChanged: (next: Testimonial) => void,
) {
	const confirm = useConfirm();
	const { pending, pendingVisible, err, run } = useAdminAction();
	const formRef = useRef<HTMLFormElement>(null);
	const [editing, setEditing] = useState(false);
	const [saved, setSaved] = useState(false);
	const [localErr, setLocalErr] = useState<TestimonialDraftError | null>(null);
	const [showActionError, setShowActionError] = useState(false);
	const [draft, setDraft] = useState(() => draftOf(testimonial));
	const [base, setBase] = useState(() => draftOf(testimonial));
	const dirty = editing && !sameDraft(draft, base);

	const incoming = draftOf(testimonial);
	if (!sameDraft(incoming, base)) {
		setBase(incoming);
		if (!dirty) setDraft(incoming);
	}

	useAdminDraftGuard(dirty || pending);

	useEffect(() => {
		if (editing) focusField(formRef.current, "quote");
	}, [editing]);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	const clearFeedback = () => {
		setLocalErr(null);
		setShowActionError(false);
		setSaved(false);
	};

	const open = () => {
		setDraft(draftOf(testimonial));
		clearFeedback();
		setEditing(true);
	};

	/** Resolves true once the editor closed: no draft, or the maintainer chose to discard it. */
	const close = async () => {
		if (pending) return false;
		if (
			dirty &&
			!(await confirm({
				title: "Discard changes?",
				body: "Your unsaved testimonial changes will be lost.",
				confirmLabel: "Discard changes",
				cancelLabel: "Keep editing",
			}))
		) {
			return false;
		}
		clearFeedback();
		setEditing(false);
		return true;
	};

	const setField = (field: keyof TestimonialDraft, value: string) => {
		setDraft((previous) => ({ ...previous, [field]: value }));
		clearFeedback();
	};

	const save = () => {
		if (pending) return;
		clearFeedback();
		const parsed = parseTestimonialDraft(draft);
		if ("error" in parsed) {
			setLocalErr(parsed.error);
			focusField(formRef.current, parsed.error.field);
			return;
		}
		const { fields } = parsed;
		const formData = new FormData();
		for (const field of DRAFT_FIELDS) formData.set(field, fields[field] ?? "");
		setShowActionError(true);
		void run(
			() => updateTestimonial(testimonial.id, formData),
			() => {
				const next = {
					...testimonial,
					quote: fields.quote,
					authorName: fields.authorName,
					authorLocation: fields.authorLocation ?? undefined,
					artworkSlug: fields.artworkSlug ?? undefined,
				};
				setDraft(draftOf(next));
				setSaved(true);
				onChanged(next);
			},
		);
	};

	return {
		editing,
		open,
		close,
		save,
		setField,
		draft,
		pending,
		pendingVisible,
		saved,
		fieldError: localErr,
		actionError: showActionError ? err : null,
		formRef,
	};
}

export type TestimonialEditorState = ReturnType<typeof useTestimonialEditor>;

/** The inline form under a testimonial row: quote, author, location, linked piece; Save and Cancel. */
export function TestimonialEditor({
	id,
	testimonialId,
	authorName,
	artworks,
	editor,
	onCancel,
}: Readonly<{
	id: string;
	testimonialId: string;
	authorName: string;
	artworks: readonly ArtworkTitle[];
	editor: TestimonialEditorState;
	onCancel: () => void;
}>) {
	const errorId = useId();
	const { draft, fieldError, pending } = editor;
	const fieldIds = {
		quote: `testimonial-quote-${testimonialId}`,
		authorName: `testimonial-author-${testimonialId}`,
		authorLocation: `testimonial-location-${testimonialId}`,
		artworkSlug: `testimonial-artwork-${testimonialId}`,
	};
	const invalid = (field: keyof TestimonialDraft) =>
		fieldError?.field === field ? { "aria-invalid": true, "aria-describedby": errorId } : {};
	// A soft link can outlive its piece; keep it selectable so a save never drops it silently.
	const orphanSlug =
		draft.artworkSlug && !artworks.some((a) => a.slug === draft.artworkSlug)
			? draft.artworkSlug
			: null;

	return (
		<form
			ref={editor.formRef}
			id={id}
			noValidate
			aria-label={`Edit testimonial from ${authorName}`}
			aria-busy={pending || undefined}
			className="mt-3 border-t border-line pt-3"
			onSubmit={(event) => {
				event.preventDefault();
				editor.save();
			}}
		>
			<div className="grid gap-(--form-gap) sm:grid-cols-2">
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={fieldIds.quote}>Quote *</label>
					<textarea
						id={fieldIds.quote}
						name="quote"
						required
						rows={4}
						maxLength={TESTIMONIAL_LIMITS.quote}
						disabled={pending}
						value={draft.quote}
						onChange={(event) => editor.setField("quote", event.target.value)}
						className={cn(adminField, "min-h-32 resize-y")}
						{...invalid("quote")}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={fieldIds.authorName}>Author name *</label>
					<input
						id={fieldIds.authorName}
						name="authorName"
						required
						autoCapitalize="words"
						autoCorrect="off"
						maxLength={TESTIMONIAL_LIMITS.authorName}
						disabled={pending}
						value={draft.authorName}
						onChange={(event) => editor.setField("authorName", event.target.value)}
						className={adminField}
						{...invalid("authorName")}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={fieldIds.authorLocation}>Location (optional)</label>
					<input
						id={fieldIds.authorLocation}
						name="authorLocation"
						maxLength={TESTIMONIAL_LIMITS.authorLocation}
						disabled={pending}
						value={draft.authorLocation}
						onChange={(event) => editor.setField("authorLocation", event.target.value)}
						className={adminField}
						{...invalid("authorLocation")}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={fieldIds.artworkSlug}>Link to an artwork (optional)</label>
					<select
						id={fieldIds.artworkSlug}
						name="artworkSlug"
						disabled={pending}
						value={draft.artworkSlug}
						onChange={(event) => editor.setField("artworkSlug", event.target.value)}
						className={adminField}
						{...invalid("artworkSlug")}
					>
						<option value="">None</option>
						{orphanSlug ? <option value={orphanSlug}>A piece no longer listed</option> : null}
						{artworks.map((a) => (
							<option key={a.slug} value={a.slug}>
								{a.title}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button type="button" disabled={pending} onClick={onCancel} className={adminBtn}>
					Cancel
				</button>
				<button
					type="submit"
					disabled={pending}
					aria-busy={pending}
					className={cn(adminBtnPrimary, "w-full sm:w-auto")}
				>
					{editor.pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Check size={ICON_MD} aria-hidden="true" />
					)}
					Save
				</button>
				{editor.saved ? <AdminNotice variant="success">Saved</AdminNotice> : null}
			</div>
			{fieldError ? (
				<AdminNotice id={errorId} variant="error" className="mt-3">
					{fieldError.message}
				</AdminNotice>
			) : null}
			{!fieldError && editor.actionError ? (
				<AdminErrorNotice className="mt-3">{editor.actionError}</AdminErrorNotice>
			) : null}
		</form>
	);
}

"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updateEventMeta } from "../event-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { adminBtnPrimary, adminField, adminLabel, ICON_MD } from "./controls";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

function eventDraft(event: Event) {
	return {
		title: event.title,
		date: event.eventDate.slice(0, 10),
		category: event.category ?? "",
		description: event.description ?? "",
	};
}

/** Inline editor for an event's text fields (title, date, category, description). */
export function EventMetaEditor({
	event,
	categories,
	disabled = false,
	onPendingChange,
	onChanged,
}: Readonly<{
	event: Event;
	categories?: readonly string[];
	disabled?: boolean;
	onPendingChange?: (pending: boolean) => void;
	onChanged?: (patch: Partial<Event>) => void;
}>) {
	const { pending, pendingVisible, err, run } = useAdminAction();
	const blocked = pending || disabled;
	const errorId = useId();
	const titleRef = useRef<HTMLInputElement>(null);
	const dateRef = useRef<HTMLInputElement>(null);
	const [title, setTitle] = useState(event.title);
	const [date, setDate] = useState(event.eventDate.slice(0, 10));
	const [category, setCategory] = useState(event.category ?? "");
	const [description, setDescription] = useState(event.description ?? "");
	const [saved, setSaved] = useState(false);
	const [localErr, setLocalErr] = useState<string | null>(null);
	const [invalidField, setInvalidField] = useState<"title" | "date" | null>(null);
	const [baseline, setBaseline] = useState(() => eventDraft(event));
	const incoming = eventDraft(event);
	const incomingKey = JSON.stringify(incoming);
	const [seenKey, setSeenKey] = useState(incomingKey);
	const dirty =
		title !== baseline.title ||
		date !== baseline.date ||
		category !== baseline.category ||
		description !== baseline.description;
	useAdminDraftGuard(dirty || pending);

	if (incomingKey !== seenKey) {
		setSeenKey(incomingKey);
		setBaseline(incoming);
		if (!dirty) {
			setTitle(incoming.title);
			setDate(incoming.date);
			setCategory(incoming.category);
			setDescription(incoming.description);
		}
	}

	useEffect(() => {
		onPendingChange?.(pending);
	}, [pending, onPendingChange]);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	const clearFeedback = () => {
		setSaved(false);
		setLocalErr(null);
		setInvalidField(null);
	};

	const onSave = () => {
		if (blocked) return;
		clearFeedback();
		if (!title.trim()) {
			setLocalErr("Enter a title.");
			setInvalidField("title");
			titleRef.current?.focus();
			return;
		}
		if (!date || Number.isNaN(Date.parse(date))) {
			setLocalErr("Choose an event date.");
			setInvalidField("date");
			dateRef.current?.focus();
			return;
		}
		run(
			() =>
				updateEventMeta(event.id, {
					title: title.trim(),
					eventDate: date,
					category: category.trim() || null,
					description: description.trim() || null,
				}),
			() => {
				setTitle(title.trim());
				setCategory(category.trim());
				setDescription(description.trim());
				setBaseline({
					title: title.trim(),
					date,
					category: category.trim(),
					description: description.trim(),
				});
				onChanged?.({
					title: title.trim(),
					eventDate: date,
					category: category.trim() || undefined,
					description: description.trim() || undefined,
				});
				setSaved(true);
			},
		);
	};

	const error = localErr ?? err;

	return (
		<form
			aria-label={`Details for ${event.title}`}
			aria-busy={pending || undefined}
			className="grid gap-(--form-gap)"
			onSubmit={(e) => {
				e.preventDefault();
				onSave();
			}}
		>
			<div className="grid gap-(--form-gap) sm:grid-cols-2">
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`event-title-${event.id}`}>Title *</label>
					<input
						ref={titleRef}
						disabled={blocked}
						required
						aria-invalid={invalidField === "title" ? true : undefined}
						aria-describedby={invalidField === "title" ? errorId : undefined}
						onInvalid={() => {
							setLocalErr("Enter a title.");
							setInvalidField("title");
						}}
						id={`event-title-${event.id}`}
						value={title}
						onChange={(e) => {
							setTitle(e.target.value);
							clearFeedback();
						}}
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={`event-date-${event.id}`}>Event date *</label>
					<input
						ref={dateRef}
						disabled={blocked}
						required
						aria-invalid={invalidField === "date" ? true : undefined}
						aria-describedby={invalidField === "date" ? errorId : undefined}
						onInvalid={() => {
							setLocalErr("Choose an event date.");
							setInvalidField("date");
						}}
						id={`event-date-${event.id}`}
						type="date"
						value={date}
						onChange={(e) => {
							setDate(e.target.value);
							clearFeedback();
						}}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`event-category-${event.id}`}>Category (optional)</label>
					<input
						disabled={blocked}
						id={`event-category-${event.id}`}
						list={categories ? "event-categories" : undefined}
						value={category}
						onChange={(e) => {
							setCategory(e.target.value);
							clearFeedback();
						}}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`event-description-${event.id}`}>Description (optional)</label>
					<textarea
						disabled={blocked}
						id={`event-description-${event.id}`}
						value={description}
						onChange={(e) => {
							setDescription(e.target.value);
							clearFeedback();
						}}
						rows={3}
						className={adminField}
					/>
				</div>
			</div>
			<div className="mt-(--space-tight) flex flex-wrap items-center gap-2">
				<button type="submit" disabled={blocked} aria-busy={pending} className={adminBtnPrimary}>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Check size={ICON_MD} aria-hidden="true" />
					)}
					Save details
				</button>
				{saved ? <AdminNotice variant="success">Saved</AdminNotice> : null}
				{error ? (
					<AdminNotice id={errorId} variant="error">
						{error}
					</AdminNotice>
				) : null}
			</div>
		</form>
	);
}

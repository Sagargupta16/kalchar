"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updateEventMeta } from "../event-actions";
import { AdminNotice } from "./admin-notice";
import { adminBtnPrimary, adminField, adminLabel, ICON_MD } from "./controls";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

/** Inline editor for an event's text fields (title, date, category, description). */
export function EventMetaEditor({
	event,
	categories,
}: Readonly<{ event: Event; categories?: readonly string[] }>) {
	const { pending, pendingVisible, err, run } = useAdminAction();
	const [title, setTitle] = useState(event.title);
	const [date, setDate] = useState(event.eventDate.slice(0, 10));
	const [category, setCategory] = useState(event.category ?? "");
	const [description, setDescription] = useState(event.description ?? "");
	const [saved, setSaved] = useState(false);
	const [localErr, setLocalErr] = useState<string | null>(null);

	const onSave = () => {
		setSaved(false);
		setLocalErr(null);
		if (!title.trim()) {
			setLocalErr("Enter a title.");
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
				setSaved(true);
				setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const error = localErr ?? err;

	return (
		<div className="grid gap-(--form-gap)">
			<div className="grid gap-(--form-gap) sm:grid-cols-2">
				<div className={adminLabel}>
					<label htmlFor={`event-title-${event.id}`}>Title *</label>
					<input
						disabled={pending}
						required
						id={`event-title-${event.id}`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={`event-date-${event.id}`}>Event date *</label>
					<input
						disabled={pending}
						required
						id={`event-date-${event.id}`}
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`event-category-${event.id}`}>Category (optional)</label>
					<input
						disabled={pending}
						id={`event-category-${event.id}`}
						list={categories ? "event-categories" : undefined}
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor={`event-description-${event.id}`}>Description (optional)</label>
					<textarea
						disabled={pending}
						id={`event-description-${event.id}`}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
						className={adminField}
					/>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={pending}
					aria-busy={pending}
					onClick={onSave}
					className={adminBtnPrimary}
				>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : (
						<Check size={ICON_MD} aria-hidden="true" />
					)}
					Save details
				</button>
				{saved ? <AdminNotice variant="success">Saved</AdminNotice> : null}
				{error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
			</div>
		</div>
	);
}

"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/lib/types";
import { updateEventMeta } from "../event-actions";
import { adminBtnPrimary, adminField } from "./controls";
import { useAdminAction } from "./use-admin-action";

/** Inline editor for an event's text fields (title, date, category, description). */
export function EventMetaEditor({ event }: Readonly<{ event: Event }>) {
	const { pending, err, run } = useAdminAction();
	const [title, setTitle] = useState(event.title);
	const [date, setDate] = useState(event.eventDate.slice(0, 10));
	const [category, setCategory] = useState(event.category ?? "");
	const [description, setDescription] = useState(event.description ?? "");
	const [saved, setSaved] = useState(false);

	const onSave = () =>
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
				setTimeout(() => setSaved(false), 2000);
			},
		);

	return (
		<div className="space-y-2">
			<div className="grid gap-2 sm:grid-cols-2">
				<input
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Title"
					className={adminField}
				/>
				<input
					type="date"
					value={date}
					onChange={(e) => setDate(e.target.value)}
					aria-label="Event date"
					className={adminField}
				/>
				<input
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					placeholder="Category"
					className={`${adminField} sm:col-span-2`}
				/>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
					placeholder="Description"
					className={`${adminField} sm:col-span-2`}
				/>
			</div>
			<div className="flex items-center gap-2.5">
				<button
					type="button"
					disabled={pending}
					onClick={onSave}
					className={`${adminBtnPrimary} px-3 py-1.5`}
				>
					<Check size={14} />
					Save details
				</button>
				{saved ? <span className="text-sm text-accent">Saved</span> : null}
				{err ? <span className="text-sm text-ruby">{err}</span> : null}
			</div>
		</div>
	);
}

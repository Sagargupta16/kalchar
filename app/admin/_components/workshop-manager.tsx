"use client";

import { ExternalLink, LoaderCircle, Plus, Presentation } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Workshop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createWorkshop, reorderWorkshops } from "../actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
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
import { ReorderBar } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";
import { WorkshopRow } from "./workshop-row";

export function WorkshopManager({ workshops: initial }: Readonly<{ workshops: Workshop[] }>) {
	// The manager's action serves the reorder save only; the create form and the
	// rows each own theirs (C10, C12).
	const { pending, err, run } = useAdminAction();
	const reduceMotion = usePrefersReducedMotion();
	const headingId = useId();
	const [baseline, setBaseline] = useState(initial);
	const [creating, setCreating] = useState(false);
	const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
	const createdRef = useRef<typeof created>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	// Adopt fresh server data after a create (router.refresh), resetting the
	// reorder baseline to match so a new row doesn't read as an unsaved move.
	const [items, setItems] = useServerSyncedList(initial, (next) => {
		setBaseline(next);
		if (createdRef.current) setArrivedId(createdRef.current.id);
	});
	const [saved, setSaved] = useState(false);
	const { dragging, over, dragProps, move } = useReorder(items, setItems, pending);

	// Scroll the just-created row into view and highlight it (C13); workshops append last.
	useEffect(() => {
		if (!arrivedId) return;
		requestAnimationFrame(() => {
			document
				.getElementById(`workshop-${arrivedId}`)
				?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [arrivedId, reduceMotion]);

	const handleSaveOrder = () => {
		setSaved(false);
		return run(
			() => reorderWorkshops(items.map((i) => i.slug)),
			() => {
				setBaseline(items);
				setSaved(true);
				window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const openPanel = () => {
		setCreated(null);
		createdRef.current = null;
		setCreating(true);
	};

	const onCreated = (next: { id: string; title: string }) => {
		setCreated(next);
		createdRef.current = next;
		setCreating(false);
	};

	const hasOrderChanges = items.some((item, i) => item.slug !== baseline[i]?.slug);

	return (
		<div className="space-y-group">
			{/* Ruling 42: the create area and the list are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<div className="min-w-0 space-y-group">
					{creating ? (
						<CreateWorkshopForm onCancel={() => setCreating(false)} onCreated={onCreated} />
					) : (
						<button
							type="button"
							onClick={openPanel}
							className={cn(adminBtnPrimary, "w-full sm:w-auto")}
						>
							<Plus size={ICON_MD} aria-hidden="true" />
							Add workshop
						</button>
					)}
					{created ? (
						<AdminNotice variant="success">
							<span className="min-w-0">
								&ldquo;{created.title}&rdquo; added. It is last in the list; use its arrows or drag
								it to move it.{" "}
								<Link
									href="/workshops"
									className="underline underline-offset-2 hover:text-accent-text"
								>
									View on site
									<ExternalLink
										size={ICON_SM}
										aria-hidden="true"
										className="ml-1 inline-block align-[-2px]"
									/>
								</Link>
							</span>
						</AdminNotice>
					) : null}
				</div>

				<section aria-labelledby={headingId} className="min-w-0">
					<AdminPanelHeader
						as="h2"
						id={headingId}
						title={`All workshops (${items.length})`}
						description="This is the order the public page uses."
					/>
					<ul aria-labelledby={headingId} className="space-y-tight">
						{items.map((w, i) => (
							<WorkshopRow
								key={w.slug}
								workshop={w}
								listPending={pending}
								dragProps={dragProps(i)}
								dragging={dragging === i}
								over={over === i && dragging !== i}
								highlighted={w.slug === arrivedId}
								reorderHandle={
									<ReorderHandle
										label={w.title}
										index={i}
										count={items.length}
										disabled={pending}
										onMove={(to) => move(i, to)}
									/>
								}
								onChanged={(next) => {
									setItems((prev) => prev.map((item) => (item.slug === next.slug ? next : item)));
									setBaseline((prev) =>
										prev.map((item) => (item.slug === next.slug ? next : item)),
									);
								}}
								onDeleted={(slug) => {
									setItems((prev) => prev.filter((item) => item.slug !== slug));
									setBaseline((prev) => prev.filter((item) => item.slug !== slug));
								}}
							/>
						))}
						{items.length === 0 ? (
							<EmptyState
								as="li"
								variant="compact"
								voice="tool"
								icon={<Presentation size={ICON_LG} aria-hidden="true" />}
								title="No workshops yet"
								body="Add one and it appears on the public workshops page."
								action={
									creating ? null : (
										<button type="button" onClick={openPanel} className={adminBtn}>
											Add workshop
										</button>
									)
								}
							/>
						) : null}
					</ul>
				</section>
			</div>

			{hasOrderChanges || saved ? (
				<ReorderBar
					label="Workshop order changed"
					pending={pending}
					saved={saved}
					error={err}
					onSave={handleSaveOrder}
					onReset={() => setItems(baseline)}
				/>
			) : null}
		</div>
	);
}

function CreateWorkshopForm({
	onCancel,
	onCreated,
}: Readonly<{
	onCancel: () => void;
	onCreated: (created: { id: string; title: string }) => void;
}>) {
	const { pending, pendingVisible, err, run } = useAdminAction();
	const headingId = useId();

	return (
		<form
			aria-labelledby={headingId}
			onSubmit={(e) => {
				e.preventDefault();
				const form = e.currentTarget;
				const fd = new FormData(form);
				const title = String(fd.get("title") ?? "").trim();
				let createdSlug: string | null = null;
				run(
					() =>
						createWorkshop(fd).then((result) => {
							if (!isFailure(result)) createdSlug = result.slug;
							return result;
						}),
					() => {
						form.reset();
						if (createdSlug) onCreated({ id: createdSlug, title });
					},
				);
			}}
			className={adminPanelInset}
		>
			<AdminPanelHeader
				id={headingId}
				title="Add a workshop"
				description="What participants will make and learn, and how long it takes."
			/>
			<p className={adminHelp}>Fields marked * are required.</p>
			<div className="mt-4 grid gap-(--form-gap) sm:grid-cols-2">
				<div className={adminLabel}>
					<label htmlFor="new-workshop-title">Title *</label>
					<input
						id="new-workshop-title"
						name="title"
						placeholder="e.g. Gond painting"
						required
						// biome-ignore lint/a11y/noAutofocus: the panel opens on the user's own tap; focusing the first field is the point (C5)
						autoFocus
						autoCorrect="off"
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor="new-workshop-duration">Duration (hours) (optional)</label>
					<input
						id="new-workshop-duration"
						name="durationHours"
						type="text"
						inputMode="decimal"
						placeholder="e.g. 2"
						className={adminField}
					/>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-workshop-blurb">Description *</label>
					<textarea
						id="new-workshop-blurb"
						name="blurb"
						placeholder="What participants will make and learn"
						rows={3}
						required
						className={adminField}
					/>
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
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add workshop
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

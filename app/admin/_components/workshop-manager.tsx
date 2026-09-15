"use client";

import { ExternalLink, LoaderCircle, Plus, Presentation } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
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
import {
	focusWorkshopField,
	parseWorkshopDraft,
	useWorkshopDraftGuard,
	type WorkshopDraftError,
	WorkshopRow,
} from "./workshop-row";

export function WorkshopManager({ workshops: initial }: Readonly<{ workshops: Workshop[] }>) {
	const { pending: orderPending, err, run } = useAdminAction();
	const headingId = useId();
	const addRef = useRef<HTMLButtonElement>(null);
	const [baseline, setBaseline] = useState(initial);
	const [items, setItems] = useState(initial);
	const [seenServerKey, setSeenServerKey] = useState(() => JSON.stringify(initial));
	const [creating, setCreating] = useState(false);
	const [createPending, setCreatePending] = useState(false);
	const [pendingRows, setPendingRows] = useState(() => new Set<string>());
	const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
	const [arrivedId, setArrivedId] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [showOrderError, setShowOrderError] = useState(false);
	const pending = orderPending || createPending || pendingRows.size > 0;
	const hasOrderChanges =
		items.length !== baseline.length || items.some((item, i) => item.slug !== baseline[i]?.slug);

	// Refresh row contents and membership without throwing away a staged order.
	const serverKey = JSON.stringify(initial);
	if (seenServerKey !== serverKey) {
		setSeenServerKey(serverKey);
		setBaseline(initial);
		const incoming = new Map(initial.map((item) => [item.slug, item]));
		const previousSlugs = new Set(items.map((item) => item.slug));
		setItems(
			hasOrderChanges
				? [
						...items.flatMap((item) => incoming.get(item.slug) ?? []),
						...initial.filter((item) => !previousSlugs.has(item.slug)),
					]
				: initial,
		);
	}

	const onPendingChange = useCallback((slug: string, busy: boolean) => {
		setPendingRows((previous) => {
			if (previous.has(slug) === busy) return previous;
			const next = new Set(previous);
			if (busy) next.add(slug);
			else next.delete(slug);
			return next;
		});
	}, []);

	const changeOrder = (next: Workshop[]) => {
		setSaved(false);
		setShowOrderError(false);
		setItems(next);
	};
	const { dragging, over, dragProps, move } = useReorder(items, changeOrder, pending);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [saved]);

	// Scroll the just-created row into view and highlight it (C13); workshops append last.
	useEffect(() => {
		if (!arrivedId) return;
		const frame = requestAnimationFrame(() => {
			const row = document.getElementById(`workshop-${arrivedId}`);
			row
				?.querySelector<HTMLButtonElement>("button[aria-expanded]")
				?.focus({ preventScroll: true });
			row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
		});
		const timer = window.setTimeout(() => setArrivedId(null), SAVED_BADGE_DURATION_MS);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, [arrivedId]);

	const handleSaveOrder = () => {
		if (pending || !hasOrderChanges) return;
		setSaved(false);
		setShowOrderError(true);
		return run(
			() => reorderWorkshops(items.map((i) => i.slug)),
			() => {
				setBaseline(items);
				setSaved(true);
			},
		);
	};

	const openPanel = () => {
		setCreated(null);
		setCreating(true);
	};

	const closePanel = () => {
		setCreating(false);
		requestAnimationFrame(() => addRef.current?.focus());
	};

	const onCreated = (fields: Omit<Workshop, "order">) => {
		const next = { ...fields, order: Math.max(0, ...baseline.map((item) => item.order)) + 1 };
		const append = (previous: Workshop[]) =>
			previous.some((item) => item.slug === next.slug) ? previous : [...previous, next];
		setItems(append);
		setBaseline(append);
		setCreated({ id: next.slug, title: next.title });
		setArrivedId(next.slug);
		setCreating(false);
	};

	const onDeleted = (slug: string) => {
		const index = items.findIndex((item) => item.slug === slug);
		const nextFocus = items[index + 1] ?? items[index - 1];
		setItems((previous) => previous.filter((item) => item.slug !== slug));
		setBaseline((previous) => previous.filter((item) => item.slug !== slug));
		setShowOrderError(false);
		requestAnimationFrame(() => {
			const button = nextFocus
				? document
						.getElementById(`workshop-${nextFocus.slug}`)
						?.querySelector<HTMLButtonElement>("button[aria-expanded]")
				: addRef.current;
			(button ?? addRef.current ?? document.getElementById("new-workshop-title"))?.focus();
		});
	};

	return (
		<div className="space-y-group">
			{/* Ruling 42 + Tier 2c: the create panel spans 4 of 12 columns beside the 8-column list from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-12 lg:items-start">
				<div className="min-w-0 space-y-group lg:col-span-4">
					{creating ? (
						<CreateWorkshopForm
							listPending={orderPending || pendingRows.size > 0}
							onPendingChange={setCreatePending}
							onCancel={closePanel}
							onCreated={onCreated}
						/>
					) : (
						<button
							ref={addRef}
							type="button"
							disabled={pending}
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

				<section aria-labelledby={headingId} className="min-w-0 lg:col-span-8">
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
								onDeleted={onDeleted}
								onPendingChange={onPendingChange}
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
										<button
											type="button"
											disabled={pending}
											onClick={openPanel}
											className={adminBtn}
										>
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
				<fieldset
					disabled={createPending || pendingRows.size > 0}
					aria-label="Workshop order"
					className="contents"
				>
					<ReorderBar
						label="Workshop order changed"
						pending={orderPending}
						saved={saved && !hasOrderChanges}
						error={showOrderError ? err : null}
						onSave={handleSaveOrder}
						onReset={() => changeOrder(baseline)}
					/>
				</fieldset>
			) : null}
		</div>
	);
}

function CreateWorkshopForm({
	listPending,
	onPendingChange,
	onCancel,
	onCreated,
}: Readonly<{
	listPending: boolean;
	onPendingChange: (pending: boolean) => void;
	onCancel: () => void;
	onCreated: (created: Omit<Workshop, "order">) => void;
}>) {
	const { pending: createPending, pendingVisible, err, run } = useAdminAction();
	const headingId = useId();
	const errorId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [dirty, setDirty] = useState(false);
	const [localErr, setLocalErr] = useState<WorkshopDraftError | null>(null);
	const [showActionError, setShowActionError] = useState(false);
	const pending = createPending || listPending;
	const canDiscard = useWorkshopDraftGuard({ dirty, pending });
	const error = localErr?.message ?? (showActionError ? err : null);

	useEffect(() => {
		onPendingChange(createPending);
		return () => onPendingChange(false);
	}, [createPending, onPendingChange]);

	return (
		<form
			ref={formRef}
			noValidate
			aria-labelledby={headingId}
			onChange={(event) => {
				const values = new FormData(event.currentTarget);
				setDirty([...values.values()].some((value) => String(value) !== ""));
				setLocalErr(null);
				setShowActionError(false);
			}}
			onSubmit={(e) => {
				e.preventDefault();
				if (pending) return;
				setLocalErr(null);
				setShowActionError(false);
				const fd = new FormData(e.currentTarget);
				const result = parseWorkshopDraft({
					title: String(fd.get("title") ?? ""),
					blurb: String(fd.get("blurb") ?? ""),
					durationHours: String(fd.get("durationHours") ?? ""),
				});
				if ("error" in result) {
					setLocalErr(result.error);
					focusWorkshopField(formRef.current, result.error.field);
					return;
				}
				const { fields } = result;
				fd.set("title", fields.title);
				fd.set("blurb", fields.blurb);
				fd.set("durationHours", fields.durationHours?.toString() ?? "");
				setShowActionError(true);
				let createdSlug: string | null = null;
				run(
					() =>
						createWorkshop(fd).then((result) => {
							if (!isFailure(result)) createdSlug = result.slug;
							return result;
						}),
					() => {
						setDirty(false);
						if (createdSlug)
							onCreated({
								slug: createdSlug,
								...fields,
								durationHours: fields.durationHours ?? undefined,
							});
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
			<fieldset
				disabled={pending}
				className="mt-(--form-gap) grid min-w-0 gap-(--form-gap) sm:grid-cols-2"
			>
				<div className={adminLabel}>
					<label htmlFor="new-workshop-title">Title *</label>
					<input
						id="new-workshop-title"
						name="title"
						placeholder="e.g. Gond painting"
						required
						aria-invalid={localErr?.field === "title" || undefined}
						aria-describedby={localErr?.field === "title" ? errorId : undefined}
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
						aria-invalid={localErr?.field === "durationHours" || undefined}
						aria-describedby={
							localErr?.field === "durationHours" ? errorId : "new-workshop-duration-hint"
						}
						className={adminField}
					/>
					<p id="new-workshop-duration-hint" className={adminHelp}>
						Use hours, for example 1.5 for 90 minutes. Leave blank if the length varies.
					</p>
				</div>
				<div className={cn(adminLabel, "sm:col-span-2")}>
					<label htmlFor="new-workshop-blurb">Description *</label>
					<textarea
						id="new-workshop-blurb"
						name="blurb"
						placeholder="What participants will make and learn"
						rows={3}
						required
						aria-invalid={localErr?.field === "blurb" || undefined}
						aria-describedby={localErr?.field === "blurb" ? errorId : undefined}
						className={adminField}
					/>
				</div>
			</fieldset>
			<div className="mt-(--form-group-gap) flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					disabled={pending}
					onClick={async () => {
						if (await canDiscard()) onCancel();
					}}
					className={adminBtn}
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={pending}
					aria-busy={pending}
					className={cn(adminBtnPrimary, "w-full sm:w-auto")}
				>
					{pendingVisible ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : (
						<Plus size={ICON_MD} aria-hidden="true" />
					)}
					Add workshop
				</button>
			</div>
			{error ? (
				<AdminNotice id={errorId} variant="error" className="mt-(--form-gap)">
					{error}
				</AdminNotice>
			) : null}
		</form>
	);
}

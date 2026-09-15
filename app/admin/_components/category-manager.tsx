"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { isFailure } from "@/lib/action-result";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createCategory, deleteCategory, renameCategory, reorderCategories } from "../actions";
import { CategoryItem, useCategoryDraftWarning } from "../categories/category-item";
import { AdminNotice } from "./admin-notice";
import { AdminPanelHeader } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import {
	adminChipField,
	adminError,
	adminIconBtnPrimary,
	adminLabel,
	adminPanelInset,
	adminRow,
	ICON_MD,
} from "./controls";
import { ReorderBar } from "./reorder-bar";
import { ReorderHandle } from "./reorder-handle";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";
import { useReorder } from "./use-reorder";
import { useServerSyncedList } from "./use-server-synced-list";

/** Map of category name -> how many artworks use it (for the delete guard hint). */
type UsageMap = Record<string, number>;

function categoriesInOrder(baseline: Category[], order: readonly string[] | null): Category[] {
	if (!order) return baseline;
	const remaining = new Map(baseline.map((category) => [category.id, category]));
	const ordered = order.flatMap((id) => {
		const category = remaining.get(id);
		remaining.delete(id);
		return category ? [category] : [];
	});
	return [...ordered, ...remaining.values()];
}

export function CategoryManager({
	categories: initial,
	usage,
}: Readonly<{ categories: Category[]; usage: UsageMap }>) {
	const confirm = useConfirm();
	const router = useRouter();
	const { pending, pendingVisible, err, run } = useAdminAction();
	const [baseline, setBaseline] = useServerSyncedList(initial);
	// Keep staged positions separate so a create or rename refresh updates
	// row details without discarding the order that has not been saved yet.
	const [order, setOrder] = useState<string[] | null>(null);
	const items = categoriesInOrder(baseline, order);
	const hasOrderChanges = items.some((item, i) => item.id !== baseline[i]?.id);
	if (order && !hasOrderChanges) setOrder(null);
	const usageById = new Map(initial.map((category) => [category.id, usage[category.name] ?? 0]));
	const [saved, setSaved] = useState(false);
	const [newName, setNewName] = useState("");
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [added, setAdded] = useState<string | null>(null);
	const [errSlot, setErrSlot] = useState<"order" | "create" | `rename:${string}` | null>(null);
	const formId = useId();
	const nameRef = useRef<HTMLInputElement>(null);
	const focusAfterCreate = useRef(false);
	const [focusAfterDelete, setFocusAfterDelete] = useState<string | null>(null);
	const { dragging, over, dragProps, move } = useReorder(
		items,
		(next) => {
			setOrder(next.map((category) => category.id));
			setSaved(false);
			setErrSlot(null);
		},
		pending,
	);
	useCategoryDraftWarning(newName.trim().length > 0);

	useEffect(() => {
		if (!saved) return;
		const timeout = window.setTimeout(() => setSaved(false), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timeout);
	}, [saved]);

	useEffect(() => {
		if (!added) return;
		const timeout = window.setTimeout(() => setAdded(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timeout);
	}, [added]);

	useEffect(() => {
		if (pending || !added || !focusAfterCreate.current) return;
		focusAfterCreate.current = false;
		nameRef.current?.focus();
	}, [pending, added]);

	useEffect(() => {
		if (!focusAfterDelete) return;
		(document.getElementById(focusAfterDelete) ?? nameRef.current)?.focus();
		setFocusAfterDelete(null);
	}, [focusAfterDelete]);

	const handleSaveOrder = () => {
		setErrSlot("order");
		setSaved(false);
		return run(
			() => reorderCategories(items.map((i) => i.id)),
			() => {
				setBaseline(items);
				setOrder(null);
				setSaved(true);
			},
		);
	};

	const handleRename = (category: Category, name: string) => {
		setErrSlot(`rename:${category.id}`);
		return run(
			() => renameCategory(category.id, name),
			() =>
				setBaseline((previous) =>
					previous.map((item) => (item.id === category.id ? { ...item, name } : item)),
				),
		);
	};

	const handleDelete = async (category: Category, index: number) => {
		const deleted = await confirm({
			title: `Delete category "${category.name}"?`,
			body: "It will disappear from the gallery filter and the custom-order style picker.",
			confirmLabel: "Delete category",
			cancelLabel: "Keep category",
			action: async () => {
				const result = await deleteCategory(category.id);
				if (isFailure(result)) throw new Error(result.message);
				return true;
			},
		});
		if (!deleted) return;
		setBaseline((previous) => previous.filter((item) => item.id !== category.id));
		const next = items[index + 1] ?? items[index - 1];
		setFocusAfterDelete(next ? `${formId}-rename-${next.id}` : `${formId}-name`);
		router.refresh();
	};

	const createError = errSlot === "create" ? err : null;
	const creating = pending && errSlot === "create";

	return (
		<div className="space-y-group">
			{/* Ruling 42: the create form and the list are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<form
					noValidate
					aria-labelledby={`${formId}-title`}
					aria-busy={creating || undefined}
					className={cn(adminPanelInset, "min-w-0")}
					onSubmit={(e) => {
						e.preventDefault();
						if (pending) return;
						const name = newName.trim();
						if (!name) {
							setFieldError("Enter a category name");
							nameRef.current?.focus();
							return;
						}
						setFieldError(null);
						setAdded(null);
						setErrSlot("create");
						run(
							() => createCategory(name),
							() => {
								focusAfterCreate.current = true;
								setNewName("");
								setAdded(name);
							},
						);
					}}
				>
					<AdminPanelHeader
						id={`${formId}-title`}
						as="h2"
						title="Add a category"
						description="The style name as it should read in the gallery filter, for example Warli or Kalamkari."
					/>
					<label htmlFor={`${formId}-name`} className={adminLabel}>
						Category name
					</label>
					<div className={cn(adminChipField, "mt-2")}>
						<input
							ref={nameRef}
							id={`${formId}-name`}
							disabled={pending}
							value={newName}
							onChange={(e) => {
								setNewName(e.target.value);
								if (fieldError) setFieldError(null);
							}}
							required
							autoCapitalize="words"
							autoComplete="off"
							enterKeyHint="done"
							placeholder="New category"
							aria-label="Category name"
							aria-invalid={fieldError ? true : undefined}
							aria-describedby={fieldError ? `${formId}-error` : undefined}
							className="min-h-control min-w-0 w-full border-0 bg-transparent text-base text-ink placeholder:text-muted"
						/>
						<button
							type="submit"
							disabled={pending}
							aria-label="Add category"
							aria-busy={creating || undefined}
							className={cn(adminIconBtnPrimary, "rounded-full")}
						>
							{creating && pendingVisible ? (
								<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
							) : (
								<Plus size={ICON_MD} aria-hidden="true" />
							)}
						</button>
					</div>
					{fieldError ? (
						<p id={`${formId}-error`} role="alert" className={cn(adminError, "mt-1")}>
							{fieldError}
						</p>
					) : null}
					{createError ? (
						<AdminNotice variant="error" className="mt-3">
							{createError}
						</AdminNotice>
					) : null}
					{added ? (
						<AdminNotice variant="success" className="mt-3">
							Added "{added}" at the end of the list.
						</AdminNotice>
					) : null}
				</form>

				<ul className="min-w-0 space-y-tight">
					{items.map((c, i) => (
						<li
							key={c.id}
							{...dragProps(i)}
							className={cn(
								adminRow,
								"@container/category",
								dragging === i && "scale-[0.98] opacity-60 shadow-e3 select-none",
								over === i && dragging !== i && "border-accent shadow-e1",
							)}
						>
							<CategoryItem
								category={c}
								usageCount={usageById.get(c.id) ?? 0}
								editButtonId={`${formId}-rename-${c.id}`}
								pending={pending}
								saving={pending && errSlot === `rename:${c.id}`}
								error={errSlot === `rename:${c.id}` ? err : null}
								onEdit={() => setErrSlot(null)}
								reorderHandle={
									<ReorderHandle
										label={c.name}
										index={i}
										count={items.length}
										disabled={pending}
										onMove={(to) => move(i, to)}
									/>
								}
								onSave={(name) => handleRename(c, name)}
								onDelete={() => handleDelete(c, i)}
							/>
						</li>
					))}
					{items.length === 0 ? (
						<EmptyState as="li" variant="compact" voice="tool" title="No categories yet">
							Use Add a category to create the first style.
						</EmptyState>
					) : null}
				</ul>
			</div>

			{hasOrderChanges || saved ? (
				<ReorderBar
					label="Category order changed"
					pending={pending}
					saved={saved && !hasOrderChanges}
					error={errSlot === "order" ? err : null}
					onSave={handleSaveOrder}
					onReset={() => {
						setOrder(null);
						setSaved(false);
						setErrSlot(null);
					}}
				/>
			) : null}
		</div>
	);
}

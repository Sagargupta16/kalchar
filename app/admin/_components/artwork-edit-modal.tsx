"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { regeneratePalette } from "../artwork-actions";
import { AdminNotice } from "./admin-notice";
import { ArtworkEditFields } from "./artwork-edit-fields";
import { ConfirmPanel } from "./confirm-dialog";
import { adminBtn, adminBtnPrimary, adminHelp, adminThumb, ICON_MD } from "./controls";
import { Modal, ModalBody, ModalFooter } from "./modal";
import {
	type ArtworkEditorProps,
	type ArtworkEditorState,
	useArtworkEditor,
} from "./use-artwork-editor";

export type { ArtworkPatch } from "./use-artwork-editor";

/** One sentence for both delete entry points (row and editor): honest about photos, offers the alternative. */
export const DELETE_PIECE_BODY =
	"The piece leaves the site and the admin list. Its photos stay in storage for recovery. To keep it in the gallery but off sale, set its status to Not for sale instead.";

interface ArtworkEditModalProps extends ArtworkEditorProps {
	thumb: string;
	categories: readonly string[];
}

/**
 * The editor (D14): a full-height sheet on phones, the centred card from sm.
 * X top-left, Save changes top-right only while dirty, footer with the result
 * and Discard. Delete and Discard confirmations replace the body instead of
 * stacking a second dialog; Escape steps back one level.
 */
export function ArtworkEditModal({
	art,
	thumb,
	categories,
	onClose,
	onSaved,
	onDeleted,
}: Readonly<ArtworkEditModalProps>) {
	const editor = useArtworkEditor({ art, onClose, onSaved, onDeleted });
	const {
		pending,
		busy,
		spinning,
		closing,
		form,
		formId,
		fields,
		fieldErrors,
		replacement,
		setReplacement,
		step,
		setStep,
		err,
		lastAction,
		progress,
		dirty,
		update,
		runEdit,
		handleSave,
		handleReplace,
		handleDelete,
		requestClose,
		closeEditor,
	} = editor;

	return (
		<Modal
			title="Edit piece"
			heading={
				<span className="flex min-w-0 items-center gap-3">
					{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
					<img src={thumb} alt="" className={cn(adminThumb, "size-8")} />
					{/* The one display moment inside the tool (1.1). */}
					<span className="t-display min-w-0 truncate text-base italic">{art.title}</span>
				</span>
			}
			placement="sheet"
			closing={closing}
			size={step === "edit" ? "xl" : "lg"}
			action={
				step === "edit" && dirty ? (
					<button
						type="submit"
						form={formId}
						disabled={busy}
						aria-busy={pending || undefined}
						className={adminBtnPrimary}
					>
						{spinning ? (
							<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
						) : null}
						Save changes
					</button>
				) : null
			}
			onClose={requestClose}
		>
			{step === "edit" ? (
				<ModalBody>
					<form
						ref={form}
						id={formId}
						noValidate
						onSubmit={(event) => {
							event.preventDefault();
							void handleSave();
						}}
					>
						<ArtworkEditFields
							art={art}
							thumb={thumb}
							categories={categories}
							fields={fields}
							errors={fieldErrors}
							pending={busy}
							progress={progress}
							replacement={replacement}
							onReplacementChange={setReplacement}
							onChange={update}
							onRefreshPalette={() =>
								runEdit(() => regeneratePalette(art.slug), "Colours refreshed")
							}
							onReplace={handleReplace}
							onRequestDelete={() => setStep("confirmDelete")}
						/>
					</form>
				</ModalBody>
			) : null}
			{step === "confirmDelete" ? (
				<ModalBody>
					<ConfirmPanel
						headingLevel={3}
						title={`Delete "${art.title}"?`}
						body={DELETE_PIECE_BODY}
						confirmLabel="Delete piece"
						cancelLabel="Keep piece"
						pending={busy}
						error={lastAction === "delete" ? err : null}
						onConfirm={handleDelete}
						onCancel={() => setStep("edit")}
					/>
				</ModalBody>
			) : null}
			{step === "confirmDiscard" ? (
				<ModalBody>
					<ConfirmPanel
						headingLevel={3}
						destructive={false}
						title="Discard changes?"
						body={
							replacement
								? "Your unsaved edits and selected photo will be lost."
								: "Your edits to this piece will be lost."
						}
						confirmLabel="Discard"
						cancelLabel="Keep editing"
						pending={busy}
						onConfirm={closeEditor}
						onCancel={() => setStep("edit")}
					/>
				</ModalBody>
			) : null}
			<ArtworkEditorFooter editor={editor} />
		</Modal>
	);
}

function ArtworkEditorFeedback({ editor }: Readonly<{ editor: ArtworkEditorState }>) {
	if (editor.footerError) {
		return <AdminNotice variant="error">{editor.footerError}</AdminNotice>;
	}
	if (editor.success) {
		return <AdminNotice variant="success">{editor.success}</AdminNotice>;
	}
	return (
		<p className={adminHelp}>
			{editor.dirty ? "Unsaved changes" : "Photo selected. Choose Replace photo to save it."}
		</p>
	);
}

function ArtworkEditorFooter({ editor }: Readonly<{ editor: ArtworkEditorState }>) {
	if (!editor.showFooter) return null;
	return (
		<ModalFooter>
			<div className="min-w-0 flex-1">
				<ArtworkEditorFeedback editor={editor} />
			</div>
			{editor.hasDraft ? (
				<button
					type="button"
					onClick={() => editor.setStep("confirmDiscard")}
					disabled={editor.busy}
					className={adminBtn}
				>
					Discard
				</button>
			) : null}
		</ModalFooter>
	);
}

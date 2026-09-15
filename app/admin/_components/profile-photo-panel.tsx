"use client";

import { UserCircle } from "lucide-react";
import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import { cn, formatBytes } from "@/lib/utils";
import { clearProfileImage, setProfileImage } from "../event-actions";
import {
	PROFILE_PHOTO_ACCEPT,
	PROFILE_PHOTO_MAX_MB,
	ProfilePhotoDraft,
	validateProfilePhoto,
} from "../profile/profile-photo-draft";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { useConfirm } from "./confirm-dialog";
import { adminBtnPrimary, adminHelp, FOCUS_WITHIN } from "./controls";
import { stageImage } from "./stage-image";
import type { UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

/** Text-shaped picker trigger under the portrait, with the file input's focus ring. */
const changePhotoLabel = cn(
	"inline-flex min-h-control cursor-pointer items-center rounded-md px-2 text-sm font-semibold text-accent-text transition-ui pressable has-disabled:pointer-events-none has-disabled:opacity-50",
	FOCUS_WITHIN,
);
const removePhotoBtn =
	"inline-flex min-h-control items-center rounded-md px-2 text-sm font-medium text-muted transition-ui pressable hover:text-ruby disabled:pointer-events-none disabled:opacity-50";

/** The saved photo and the selected upload stay independent until the upload succeeds. */
export function ProfilePhotoPanel({ imageKey }: Readonly<{ imageKey?: string }>) {
	const confirm = useConfirm();
	const photo = useAdminAction();
	const [file, setFile] = useState<File | null>(null);
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const [photoSaved, setPhotoSaved] = useState<"updated" | "removed" | null>(null);
	const [photoOperation, setPhotoOperation] = useState<"upload" | "remove" | null>(null);
	const [restorePhotoFocus, setRestorePhotoFocus] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const photoErrorId = useId();
	const fileProblem = validateProfilePhoto(file);
	const photoError = photoOperation ? photo.err : null;
	const uploading = photo.pending && photoOperation === "upload";

	useAdminDraftGuard(Boolean(file) || photo.pending);

	useEffect(() => {
		if (!photoSaved) return;
		const timer = window.setTimeout(() => setPhotoSaved(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [photoSaved]);

	useEffect(() => {
		if (photo.pending || !restorePhotoFocus) return;
		setRestorePhotoFocus(false);
		inputRef.current?.focus();
	}, [photo.pending, restorePhotoFocus]);

	const clearFile = () => {
		setFile(null);
		setPhotoOperation(null);
		setPhotoSaved(null);
		if (inputRef.current) {
			inputRef.current.value = "";
			inputRef.current.focus();
		}
	};

	const onUpload = (form: HTMLFormElement) => {
		if (!file || fileProblem || photo.pending) return;
		const uploadingLabel = `Uploading ${formatBytes(file.size)}`;
		setPhotoSaved(null);
		setPhotoOperation("upload");
		photo.run(
			async () => {
				try {
					setProgress({ label: uploadingLabel, fraction: 0 });
					const key = await stageImage(file, (fraction) =>
						setProgress({ label: uploadingLabel, fraction }),
					);
					setProgress({ label: "Preparing sizes for phones and desktops", fraction: null });
					const formData = new FormData();
					formData.set("imageKey", key);
					return await setProfileImage(formData);
				} finally {
					setProgress(null);
				}
			},
			() => {
				clearFile();
				form.reset();
				setPhotoSaved("updated");
				setRestorePhotoFocus(true);
			},
		);
	};

	const onClear = async () => {
		if (photo.pending) return;
		const ok = await confirm({
			title: "Remove profile photo?",
			body: file
				? "The About page and home will show the artist's initials instead. Your selected photo will stay here until you upload or clear it."
				: "The About page and home will show the artist's initials instead.",
			confirmLabel: "Remove photo",
			cancelLabel: "Keep photo",
		});
		if (!ok) return;
		setPhotoSaved(null);
		setPhotoOperation("remove");
		photo.run(
			() => clearProfileImage(),
			() => {
				setPhotoSaved("removed");
				setRestorePhotoFocus(true);
			},
		);
	};

	return (
		<AdminPanel
			title="Profile photo"
			description="Shown on the About page and home. Square or portrait works best. Without a photo, the artist's initials appear instead."
			className="min-w-0"
		>
			<div className="flex flex-col items-center gap-3">
				<ProfilePhotoPreview imageKey={imageKey} pending={photo.pending} progress={progress} />
				<ProfilePhotoPicker
					file={file}
					fileProblem={fileProblem}
					photoError={photoError}
					photoErrorId={photoErrorId}
					inputRef={inputRef}
					pending={photo.pending}
					uploading={uploading}
					onSelect={(selected) => {
						setFile(selected);
						setPhotoOperation(null);
						setPhotoSaved(null);
					}}
					onClear={clearFile}
					onUpload={onUpload}
				/>
				{imageKey ? (
					<button
						type="button"
						disabled={photo.pending}
						aria-busy={(photo.pending && photoOperation === "remove") || undefined}
						onClick={onClear}
						className={removePhotoBtn}
					>
						Remove photo
					</button>
				) : null}
				{photo.pending && photoOperation === "remove" ? (
					<output className={cn(adminHelp, "block")}>Removing saved photo…</output>
				) : null}
			</div>
			{photoError ? (
				<>
					<AdminNotice id={photoErrorId} variant="error" className="mt-3 wrap-anywhere">
						{photoError}
					</AdminNotice>
					{photoOperation === "upload" && file ? (
						<p className={cn(adminHelp, "mt-2")}>
							Your selected photo is still here. Select Upload photo to try again.
						</p>
					) : null}
				</>
			) : null}
			{photoSaved === "updated" ? (
				<AdminNotice variant="success" className="mt-3">
					Profile photo updated. It shows on About and home.
				</AdminNotice>
			) : null}
			{photoSaved === "removed" ? (
				<AdminNotice variant="success" className="mt-3">
					Photo removed. The artist&apos;s initials show instead.
				</AdminNotice>
			) : null}
		</AdminPanel>
	);
}

function ProfilePhotoPicker({
	file,
	fileProblem,
	photoError,
	photoErrorId,
	inputRef,
	pending,
	uploading,
	onSelect,
	onClear,
	onUpload,
}: Readonly<{
	file: File | null;
	fileProblem: string | null;
	photoError: string | null;
	photoErrorId: string;
	inputRef: RefObject<HTMLInputElement | null>;
	pending: boolean;
	uploading: boolean;
	onSelect: (file: File) => void;
	onClear: () => void;
	onUpload: (form: HTMLFormElement) => void;
}>) {
	const photoHintId = useId();
	const fileProblemId = useId();
	const describedBy = [
		photoHintId,
		fileProblem ? fileProblemId : null,
		photoError ? photoErrorId : null,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<form
			aria-label="Upload profile photo"
			aria-busy={pending || undefined}
			className="flex w-full flex-col items-center gap-3"
			onSubmit={(event) => {
				event.preventDefault();
				onUpload(event.currentTarget);
			}}
		>
			<label className={changePhotoLabel}>
				<span>Change photo</span>
				<input
					ref={inputRef}
					name="image"
					type="file"
					accept={PROFILE_PHOTO_ACCEPT}
					disabled={pending}
					aria-invalid={Boolean(fileProblem) || undefined}
					aria-describedby={describedBy}
					onChange={(event) => {
						const selected = event.currentTarget.files?.[0];
						if (selected) onSelect(selected);
					}}
					className="sr-only"
				/>
			</label>
			<p id={photoHintId} className={adminHelp}>
				JPG, PNG or WebP, up to {PROFILE_PHOTO_MAX_MB} MB. Choose a photo, check the preview, then
				select Upload photo to save it.
			</p>
			{fileProblem ? (
				<AdminNotice id={fileProblemId} variant="error" className="w-full wrap-anywhere">
					{fileProblem}
				</AdminNotice>
			) : null}
			{file ? (
				<>
					<ProfilePhotoDraft
						file={file}
						invalid={Boolean(fileProblem)}
						uploading={uploading}
						disabled={pending}
						onClear={onClear}
					/>
					<button
						type="submit"
						disabled={pending || Boolean(fileProblem)}
						aria-busy={uploading || undefined}
						className={adminBtnPrimary}
					>
						Upload photo
					</button>
				</>
			) : null}
		</form>
	);
}

function ProfilePhotoPreview({
	imageKey,
	pending,
	progress,
}: Readonly<{
	imageKey?: string;
	pending: boolean;
	progress: UploadProgressState | null;
}>) {
	const [failedPreview, setFailedPreview] = useState<string | null>(null);
	const [previewVersion, setPreviewVersion] = useState(0);
	const previewQuery = previewVersion ? `?preview=${previewVersion}` : "";
	const previewSrc = imageKey ? `${IMAGE_ORIGIN}/${imageKey}-400.webp${previewQuery}` : null;
	const previewFailed = previewSrc !== null && failedPreview === previewSrc;
	const uploadProgress = pending ? progress : null;

	return (
		<>
			<div className="relative size-32 shrink-0">
				<div className="size-full overflow-hidden rounded-full bg-canvas ring-1 ring-line">
					{previewSrc && !previewFailed ? (
						// Remount saved swaps and preview retries so the new source fades in.
						// biome-ignore lint/performance/noImgElement: admin-only preview, R2 origin, next/image not configured for this host
						<img
							key={previewSrc}
							src={previewSrc}
							alt="Current profile"
							onError={() => setFailedPreview(previewSrc)}
							className="size-full object-cover starting:opacity-0 transition-opacity duration-(--duration-base)"
						/>
					) : (
						<span className="grid size-full place-items-center text-muted">
							<UserCircle size={32} aria-hidden="true" />
						</span>
					)}
				</div>
				{uploadProgress ? <UploadProgressRing state={uploadProgress} /> : null}
			</div>
			{previewFailed ? (
				<div className="grid justify-items-center gap-1">
					<p className={adminHelp}>Saved photo preview unavailable.</p>
					<button
						type="button"
						disabled={pending}
						onClick={() => setPreviewVersion((version) => version + 1)}
						className={changePhotoLabel}
					>
						Reload preview
					</button>
				</div>
			) : null}
			{uploadProgress ? (
				<p aria-live="polite" className="text-label text-muted tabular-nums">
					{uploadProgress.label}
					{uploadProgress.fraction === null
						? ""
						: `, ${Math.round(Math.min(1, Math.max(0, uploadProgress.fraction)) * 100)}%`}
				</p>
			) : null}
		</>
	);
}

const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Native progress announces the byte fraction; the decorative SVG keeps the portrait ring. */
function UploadProgressRing({ state }: Readonly<{ state: UploadProgressState }>) {
	const fraction = state.fraction === null ? null : Math.min(1, Math.max(0, state.fraction));
	const percent = fraction === null ? null : Math.round(fraction * 100);
	return (
		<>
			<progress
				aria-label={state.label}
				max={100}
				value={percent ?? undefined}
				className="sr-only"
			/>
			<svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 -rotate-90">
				<circle
					cx="50"
					cy="50"
					r={RING_RADIUS}
					fill="none"
					strokeWidth="4"
					strokeLinecap="round"
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={RING_CIRCUMFERENCE * (1 - (fraction ?? 1))}
					className="stroke-accent transition-[stroke-dashoffset] duration-(--duration-fast) ease-(--ease-out)"
				/>
			</svg>
		</>
	);
}

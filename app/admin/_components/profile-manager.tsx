"use client";

import { UserCircle } from "lucide-react";
import { useOptimistic, useRef, useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import { cn, formatBytes } from "@/lib/utils";
import { clearProfileImage, setProfileImage, setShowHomeIntro } from "../event-actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { AdminSwitch } from "./admin-switch";
import { useConfirm } from "./confirm-dialog";
import { adminBtnPrimary, adminHelp, FOCUS_WITHIN } from "./controls";
import { PhotoPreview } from "./photo-preview";
import { stageImage } from "./stage-image";
import { UndoBar, useUndo } from "./undo-bar";
import type { UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

interface ProfileManagerProps {
	imageKey?: string;
	showHomeIntro: boolean;
}

/** Text-shaped picker trigger under the portrait (Tier 2f): opens the OS picker in one tap. */
const changePhotoLabel = cn(
	"inline-flex min-h-control cursor-pointer items-center text-sm font-semibold text-accent-text transition-ui pressable has-disabled:pointer-events-none has-disabled:opacity-50",
	FOCUS_WITHIN,
);

/** Muted text destructive (Tier 2f): quiet at rest, ruby on hover, confirm kept. */
const removePhotoBtn =
	"inline-flex min-h-control items-center text-sm font-medium text-muted transition-ui pressable hover:text-ruby disabled:pointer-events-none disabled:opacity-50";

/**
 * Artist profile settings: the avatar shown on About + home, and the toggle
 * that controls whether a short intro appears on the home page. Both persist
 * to the `settings` table via server actions. Two independent action hooks so
 * each panel reports next to itself.
 */
export function ProfileManager({ imageKey, showHomeIntro }: Readonly<ProfileManagerProps>) {
	const confirm = useConfirm();
	const photo = useAdminAction();
	const intro = useAdminAction();
	const [file, setFile] = useState<File | null>(null);
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const [photoSaved, setPhotoSaved] = useState<"updated" | "removed" | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	// The toggle paints before the round trip; the value reverts by itself on
	// failure because the dispatch runs inside run()'s transition (React 19).
	const [shownIntro, setShownIntro] = useOptimistic(showHomeIntro);
	// A flip applies at once and can be taken back (D37, D26): the toast offers
	// the reverse action, which runs through the same intro.run.
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(intro.run);

	const clearFile = () => {
		setFile(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	const onUpload = (form: HTMLFormElement) => {
		if (!file) return;
		const uploading = `Uploading ${formatBytes(file.size)}`;
		setPhotoSaved(null);
		photo.run(
			async () => {
				try {
					setProgress({ label: uploading, fraction: 0 });
					// Upload the master to R2 first, then submit just its staged key.
					const key = await stageImage(file, (fraction) =>
						setProgress({ label: uploading, fraction }),
					);
					setProgress({ label: "Preparing sizes for phones and desktops", fraction: null });
					const fd = new FormData();
					fd.set("imageKey", key);
					return await setProfileImage(fd);
				} finally {
					setProgress(null);
				}
			},
			() => {
				clearFile();
				form.reset();
				setPhotoSaved("updated");
				setTimeout(() => setPhotoSaved(null), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const onClear = async () => {
		const ok = await confirm({
			title: "Remove profile photo?",
			body: "The About page and home will fall back to the monogram.",
			confirmLabel: "Remove photo",
			cancelLabel: "Keep photo",
		});
		if (!ok) return;
		setPhotoSaved(null);
		photo.run(
			() => clearProfileImage(),
			() => {
				setPhotoSaved("removed");
				setTimeout(() => setPhotoSaved(null), SAVED_BADGE_DURATION_MS);
			},
		);
	};

	const onToggleIntro = (next: boolean) =>
		intro.run(
			async () => {
				setShownIntro(next);
				return setShowHomeIntro(next);
			},
			() => {
				offerUndo({
					message: next ? "Home intro shown" : "Home intro hidden",
					action: async () => {
						setShownIntro(!next);
						return setShowHomeIntro(!next);
					},
				});
			},
		);

	const previewSrc = imageKey ? `${IMAGE_ORIGIN}/${imageKey}-400.webp` : null;

	return (
		<>
			{/* Ruling 42: the photo panel and the intro toggle are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
				<AdminPanel
					title="Profile photo"
					description="Shown on the About page and home. Square or portrait works best. Leave it empty to use the monogram."
					className="min-w-0"
				>
					<div className="flex flex-col items-center gap-3">
						<div className="relative size-32 shrink-0">
							<div className="size-full overflow-hidden rounded-full bg-canvas ring-1 ring-line">
								{previewSrc ? (
									// biome-ignore lint/performance/noImgElement: admin-only preview, R2 origin, next/image not configured for this host
									<img src={previewSrc} alt="Current profile" className="size-full object-cover" />
								) : (
									<span className="grid size-full place-items-center text-muted">
										<UserCircle size={32} aria-hidden="true" />
									</span>
								)}
							</div>
							{photo.pending && progress ? <UploadProgressRing state={progress} /> : null}
						</div>
						{photo.pending && progress ? (
							<p aria-live="polite" className="text-label text-muted tabular-nums">
								{progress.label}
								{progress.fraction === null
									? ""
									: `, ${Math.round(Math.min(1, Math.max(0, progress.fraction)) * 100)}%`}
							</p>
						) : null}
						<form
							aria-busy={photo.pending || undefined}
							className="flex w-full flex-col items-center gap-3"
							onSubmit={(e) => {
								e.preventDefault();
								onUpload(e.currentTarget);
							}}
						>
							<label className={changePhotoLabel}>
								Change photo
								<input
									ref={inputRef}
									name="image"
									type="file"
									accept="image/jpeg,image/png,image/webp"
									disabled={photo.pending}
									onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
									className="sr-only"
								/>
							</label>
							<p className={adminHelp}>JPG, PNG or WebP, up to 20 MB.</p>
							{file ? (
								<div className="w-full">
									<PhotoPreview file={file} disabled={photo.pending} onClear={clearFile} />
								</div>
							) : null}
							{file ? (
								<button type="submit" disabled={photo.pending} className={adminBtnPrimary}>
									Upload photo
								</button>
							) : null}
						</form>
						{imageKey ? (
							<button
								type="button"
								disabled={photo.pending}
								onClick={onClear}
								className={removePhotoBtn}
							>
								Remove photo
							</button>
						) : null}
					</div>
					{photo.err ? (
						<AdminNotice variant="error" className="mt-3">
							{photo.err}
						</AdminNotice>
					) : null}
					{photoSaved === "updated" ? (
						<AdminNotice variant="success" className="mt-3">
							Profile photo updated. It shows on About and home.
						</AdminNotice>
					) : null}
					{photoSaved === "removed" ? (
						<AdminNotice variant="success" className="mt-3">
							Photo removed. The monogram shows instead.
						</AdminNotice>
					) : null}
				</AdminPanel>

				<AdminPanel
					title="Show artist intro on home"
					description="Adds the profile photo and a short intro to the home page About preview."
					className="min-w-0"
					action={
						<AdminSwitch
							checked={shownIntro}
							disabled={intro.pending}
							label="Show artist intro on home"
							onChange={onToggleIntro}
						/>
					}
				>
					{intro.err ? <AdminNotice variant="error">{intro.err}</AdminNotice> : null}
				</AdminPanel>
			</div>
			{undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError ? (intro.err ?? undoError) : null}
					onAction={undoNow}
					onDismiss={dismissUndo}
				/>
			) : null}
		</>
	);
}

const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Upload progress as a ring around the portrait (Tier 2f): the accent stroke
 * sweeps clockwise from 12 o'clock with the real byte fraction; while the
 * server prepares variants the fraction is unknown, so the ring holds full
 * with no aria-valuenow (an honest indeterminate stage, named by the label).
 */
function UploadProgressRing({ state }: Readonly<{ state: UploadProgressState }>) {
	const fraction = state.fraction === null ? null : Math.min(1, Math.max(0, state.fraction));
	const percent = fraction === null ? null : Math.round(fraction * 100);
	return (
		<svg
			viewBox="0 0 100 100"
			role="progressbar"
			aria-label={state.label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent ?? undefined}
			className="absolute inset-0 -rotate-90"
		>
			<circle
				cx="50"
				cy="50"
				r={RING_RADIUS}
				fill="none"
				strokeWidth="4"
				strokeLinecap="round"
				strokeDasharray={RING_CIRCUMFERENCE}
				strokeDashoffset={RING_CIRCUMFERENCE * (1 - (fraction ?? 1))}
				className="stroke-accent motion-safe:transition-[stroke-dashoffset] motion-safe:duration-(--duration-fast) motion-safe:ease-(--ease-out)"
			/>
		</svg>
	);
}

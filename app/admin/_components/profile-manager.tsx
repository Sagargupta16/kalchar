"use client";

import { ImagePlus, Trash2, UserCircle } from "lucide-react";
import { useOptimistic, useRef, useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import { formatBytes } from "@/lib/utils";
import { clearProfileImage, setProfileImage, setShowHomeIntro } from "../event-actions";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { AdminSwitch } from "./admin-switch";
import { useConfirm } from "./confirm-dialog";
import { adminBtnDestructive, adminBtnPrimary, adminFilePicker, ICON_MD } from "./controls";
import { PhotoPreview } from "./photo-preview";
import { stageImage } from "./stage-image";
import { UploadProgress, type UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction } from "./use-admin-action";

interface ProfileManagerProps {
	imageKey?: string;
	showHomeIntro: boolean;
}

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

	const previewSrc = imageKey ? `${IMAGE_ORIGIN}/${imageKey}-400.webp` : null;

	return (
		// Ruling 42: the photo panel and the intro toggle are independent panels, side by side from lg.
		<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
			<AdminPanel
				title="Profile photo"
				description="Shown on the About page and home. Square or portrait works best. Leave it empty to use the monogram."
				className="min-w-0"
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
					<div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-(--radius-sm) border border-line bg-canvas">
						{previewSrc ? (
							// biome-ignore lint/performance/noImgElement: admin-only preview, R2 origin, next/image not configured for this host
							<img src={previewSrc} alt="Current profile" className="h-full w-full object-cover" />
						) : (
							<span className="grid h-full w-full place-items-center text-muted">
								<UserCircle size={32} aria-hidden="true" />
							</span>
						)}
					</div>

					<div className="min-w-0 flex-1 space-y-3">
						<form
							aria-busy={photo.pending || undefined}
							className="space-y-3"
							onSubmit={(e) => {
								e.preventDefault();
								onUpload(e.currentTarget);
							}}
						>
							<label className={adminFilePicker}>
								<ImagePlus size={ICON_MD} aria-hidden="true" />
								<span>
									{file ? "Change photo" : "Choose photo (JPG, PNG or WebP, up to 20 MB)"}
								</span>
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
							{file ? (
								<PhotoPreview file={file} disabled={photo.pending} onClear={clearFile} />
							) : null}
							{file ? (
								<button type="submit" disabled={photo.pending} className={adminBtnPrimary}>
									Upload photo
								</button>
							) : null}
							{photo.pending && progress ? <UploadProgress state={progress} /> : null}
						</form>
						{imageKey ? (
							<button
								type="button"
								disabled={photo.pending}
								onClick={onClear}
								className={adminBtnDestructive}
							>
								<Trash2 size={ICON_MD} aria-hidden="true" />
								Remove photo
							</button>
						) : null}
					</div>
				</div>
				{photo.err ? (
					<AdminNotice variant="error" className="mt-3">
						{photo.err}
					</AdminNotice>
				) : null}
				{photoSaved === "updated" ? (
					<AdminNotice variant="success" className="mt-3">
						Photo updated. It shows on About and home.
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
						onChange={(next) =>
							intro.run(async () => {
								setShownIntro(next);
								return setShowHomeIntro(next);
							})
						}
					/>
				}
			>
				{intro.err ? <AdminNotice variant="error">{intro.err}</AdminNotice> : null}
			</AdminPanel>
		</div>
	);
}

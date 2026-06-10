"use client";

import { ImagePlus, Trash2, UserCircle } from "lucide-react";
import { useState } from "react";
import { IMAGE_ORIGIN } from "@/lib/image-base";
import { cn } from "@/lib/utils";
import { clearProfileImage, setProfileImage, setShowHomeIntro } from "../event-actions";
import { useConfirm } from "./confirm-dialog";
import { adminBtn, adminBtnDestructive, adminBtnPrimary } from "./controls";
import { useAdminAction } from "./use-admin-action";

interface ProfileManagerProps {
	imageKey?: string;
	showHomeIntro: boolean;
}

/**
 * Artist profile settings: the avatar shown on About + home, and the toggle
 * that controls whether a short intro appears on the home page. Both persist
 * to the `settings` table via server actions.
 */
export function ProfileManager({ imageKey, showHomeIntro }: Readonly<ProfileManagerProps>) {
	const confirm = useConfirm();
	const { pending, err, run } = useAdminAction();
	const [hasImage, setHasImage] = useState(Boolean(imageKey));
	const [intro, setIntro] = useState(showHomeIntro);
	const [fileName, setFileName] = useState<string | null>(null);
	// Cache-bust the preview after a re-upload (same key, new bytes).
	const [stamp, setStamp] = useState(0);

	const onUpload = (form: HTMLFormElement) => {
		const fd = new FormData(form);
		const file = fd.get("image");
		if (!(file instanceof File) || file.size === 0) return;
		run(
			() => setProfileImage(fd),
			() => {
				setHasImage(true);
				setFileName(null);
				setStamp((s) => s + 1);
				form.reset();
			},
		);
	};

	const onClear = async () => {
		const ok = await confirm({
			title: "Remove profile photo?",
			body: "The About page and home will fall back to the monogram.",
			confirmLabel: "Remove",
		});
		if (ok)
			run(
				() => clearProfileImage(),
				() => setHasImage(false),
			);
	};

	const onToggleIntro = () => {
		const next = !intro;
		setIntro(next);
		run(() => setShowHomeIntro(next));
	};

	const previewSrc = hasImage ? `${IMAGE_ORIGIN}/profile/artist-400.webp?v=${stamp}` : null;

	return (
		<div className="space-y-8">
			{/* Avatar */}
			<section className="rounded-(--radius-md) border border-line bg-bg p-5 sm:p-6">
				<h2 className="text-sm font-semibold">Profile photo</h2>
				<p className="mt-1 text-xs text-muted">
					Shown on the About page and home. Square or portrait works best. Leave empty to use the
					monogram.
				</p>

				<div className="mt-4 flex items-start gap-5">
					<div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-(--radius-sm) border border-line bg-bg-soft">
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
							onSubmit={(e) => {
								e.preventDefault();
								onUpload(e.currentTarget);
							}}
							className="space-y-3"
						>
							<label className={`${adminBtn} cursor-pointer px-3 py-2`}>
								<ImagePlus size={14} />
								{fileName ?? "Choose photo"}
								<input
									name="image"
									type="file"
									accept="image/jpeg,image/png,image/webp"
									onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
									className="sr-only"
								/>
							</label>
							{fileName ? (
								<button
									type="submit"
									disabled={pending}
									className={`${adminBtnPrimary} ml-2 px-3 py-2`}
								>
									{pending ? "Uploading..." : "Upload"}
								</button>
							) : null}
						</form>

						{hasImage ? (
							<button
								type="button"
								disabled={pending}
								onClick={onClear}
								className={`${adminBtnDestructive} px-3 py-1.5`}
							>
								<Trash2 size={12} />
								Remove photo
							</button>
						) : null}
					</div>
				</div>
			</section>

			{/* Home intro toggle */}
			<section className="rounded-(--radius-md) border border-line bg-bg p-5 sm:p-6">
				<div className="flex items-center justify-between gap-4">
					<div className="min-w-0">
						<h2 className="text-sm font-semibold">Show artist intro on home</h2>
						<p className="mt-1 text-xs text-muted">
							Adds the profile photo and a short intro to the home page About preview.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={intro}
						disabled={pending}
						onClick={onToggleIntro}
						className={cn(
							"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
							intro ? "bg-accent" : "bg-bg-muted",
						)}
					>
						<span
							className={cn(
								"inline-block h-5 w-5 transform rounded-full bg-bg shadow transition-transform",
								intro ? "translate-x-5" : "translate-x-0.5",
							)}
						/>
					</button>
				</div>
			</section>

			{err ? <p className="text-sm text-ruby">{err}</p> : null}
		</div>
	);
}

"use client";

import { useOptimistic } from "react";
import { cn } from "@/lib/utils";
import { setShowHomeIntro } from "../event-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { AdminPanel } from "./admin-panel";
import { AdminSwitch } from "./admin-switch";
import { adminHelp } from "./controls";
import { ProfilePhotoPanel } from "./profile-photo-panel";
import { UndoBar, useUndo } from "./undo-bar";
import { useAdminAction } from "./use-admin-action";

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
	const intro = useAdminAction();
	// The toggle paints before the round trip; the value reverts by itself on
	// failure because the dispatch runs inside run()'s transition (React 19).
	const [shownIntro, setShownIntro] = useOptimistic(showHomeIntro);
	// A flip applies at once and can be taken back (D37, D26): the toast offers
	// the reverse action, which runs through the same intro.run.
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(intro.run);

	useAdminDraftGuard(intro.pending || undoPending);

	const onToggleIntro = (next: boolean) => {
		if (intro.pending || undoPending) return;
		dismissUndo();
		return intro.run(
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
	};

	const savedIntroStatus = shownIntro ? "Shown on home" : "Hidden on home";
	const introStatus = intro.pending ? "Saving home intro…" : savedIntroStatus;

	return (
		<>
			{/* Ruling 42: the photo panel and the intro toggle are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)] lg:items-start">
				<ProfilePhotoPanel imageKey={imageKey} />

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
					<output aria-atomic="true" className={cn(adminHelp, "block")}>
						{introStatus}
					</output>
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

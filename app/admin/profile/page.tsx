import { requireAdminPage } from "@/lib/admin-auth";
import { getSetting } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { ProfileManager } from "../_components/profile-manager";

/** The profile photo runs the same variant pipeline; see app/admin/page.tsx. */
export const maxDuration = 60;

export default async function AdminProfilePage() {
	await requireAdminPage();
	const [imageKey, showHomeIntro] = await Promise.all([
		getSetting("profileImage"),
		getSetting("showHomeIntro"),
	]);

	return (
		<AdminPage
			title="Artist profile"
			description="The profile photo and the home-page intro. Changes appear on the About page and home straight away."
		>
			<ProfileManager imageKey={imageKey} showHomeIntro={showHomeIntro ?? false} />
		</AdminPage>
	);
}

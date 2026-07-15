import { getSetting } from "@/lib/data";
import { AdminPageHeader } from "../_components/admin-page-header";
import { ProfileManager } from "../_components/profile-manager";

export default async function AdminProfilePage() {
	const [imageKey, showHomeIntro] = await Promise.all([
		getSetting<string>("profileImage"),
		getSetting<boolean>("showHomeIntro"),
	]);

	return (
		<div className="max-w-2xl space-y-6">
			<AdminPageHeader
				title="Artist profile"
				description="Manage the profile photo and the home-page intro. Changes appear on the About page and home immediately."
			/>
			<ProfileManager imageKey={imageKey} showHomeIntro={showHomeIntro ?? false} />
		</div>
	);
}

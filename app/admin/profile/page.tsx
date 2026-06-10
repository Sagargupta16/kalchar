import { getSetting } from "@/lib/data";
import { ProfileManager } from "../_components/profile-manager";

export default async function AdminProfilePage() {
	const [imageKey, showHomeIntro] = await Promise.all([
		getSetting<string>("profileImage"),
		getSetting<boolean>("showHomeIntro"),
	]);

	return (
		<div className="max-w-2xl space-y-6">
			<section>
				<h2 className="text-sm font-semibold">Artist profile</h2>
				<p className="mt-1 text-xs text-muted">
					Manage the profile photo and the home-page intro. Changes appear on the About page and
					home immediately.
				</p>
			</section>
			<ProfileManager imageKey={imageKey} showHomeIntro={showHomeIntro ?? false} />
		</div>
	);
}

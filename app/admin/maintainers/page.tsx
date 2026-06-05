/**
 * Maintainers roster page. Lists current maintainers and lets any logged-in
 * maintainer invite new ones. Root maintainers are badged and can't be removed
 * (the action throws; the UI hides the remove button for them).
 */
import { auth } from "@/auth";
import { listMaintainers } from "@/lib/maintainers";
import { MaintainerManager } from "../_components/maintainer-manager";

export default async function MaintainersPage() {
	const [roster, session] = await Promise.all([listMaintainers(), auth()]);
	const me = session?.user?.email?.toLowerCase() ?? "";

	return (
		<div className="max-w-2xl space-y-6">
			<section>
				<h1 className="t-display text-2xl">Maintainers</h1>
				<p className="mt-1 text-sm text-muted">
					Anyone listed here can sign in and manage the catalog. Add a person by their Google email;
					they get access the next time they sign in.
				</p>
			</section>
			<MaintainerManager
				roster={roster.map((m) => ({
					email: m.email,
					name: m.name,
					isRoot: m.isRoot,
					addedBy: m.addedBy,
				}))}
				me={me}
			/>
		</div>
	);
}

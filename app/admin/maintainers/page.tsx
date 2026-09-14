import { requireAdminPage } from "@/lib/admin-auth";
import { getMaintainers } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { MaintainerManager } from "../_components/maintainer-manager";

export default async function MaintainersPage() {
	const me = await requireAdminPage();
	const roster = await getMaintainers();

	return (
		<AdminPage
			title="Maintainers"
			description="Anyone listed here can sign in with Google and manage the site. Add people by their Google email; nothing is emailed to them."
		>
			<MaintainerManager
				roster={roster.map((m) => ({
					email: m.email,
					name: m.name,
					isRoot: m.isRoot,
					addedBy: m.addedBy,
				}))}
				me={me}
			/>
		</AdminPage>
	);
}

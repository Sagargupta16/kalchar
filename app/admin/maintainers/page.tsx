import { auth } from "@/auth";
import { listMaintainers } from "@/lib/maintainers";
import { AdminPageHeader } from "../_components/admin-page-header";
import { MaintainerManager } from "../_components/maintainer-manager";

export default async function MaintainersPage() {
	const [roster, session] = await Promise.all([listMaintainers(), auth()]);
	const me = session?.user?.email?.toLowerCase() ?? "";

	return (
		<div className="max-w-2xl space-y-6">
			<AdminPageHeader
				title="Maintainers"
				description="Anyone listed here can sign in and manage the catalog. Add by Google email."
			/>
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

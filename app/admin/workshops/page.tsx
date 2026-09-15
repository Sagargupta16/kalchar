import { requireAdminPage } from "@/lib/admin-auth";
import { getAllWorkshops } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { WorkshopManager } from "../_components/workshop-manager";

export default async function AdminWorkshopsPage() {
	await requireAdminPage();
	const workshops = await getAllWorkshops();

	return (
		<AdminPage
			title="Workshops"
			description="Manage the sessions shown on the public workshops page. Open a workshop to edit it. Drag a row or use its arrows to move it, then choose Save order."
		>
			<WorkshopManager workshops={[...workshops]} />
		</AdminPage>
	);
}

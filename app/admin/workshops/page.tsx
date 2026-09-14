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
			description="The sessions shown on the public workshops page, in this order. Drag a row on a desktop, or use its arrows on a phone, to move it."
		>
			<WorkshopManager workshops={[...workshops]} />
		</AdminPage>
	);
}

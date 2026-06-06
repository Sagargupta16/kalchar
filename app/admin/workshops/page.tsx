import { getAllWorkshops } from "@/lib/data";
import { WorkshopManager } from "../_components/workshop-manager";

export default async function AdminWorkshopsPage() {
	const workshops = await getAllWorkshops();

	return (
		<div className="max-w-3xl space-y-6">
			<section>
				<h2 className="text-sm font-semibold">Workshops</h2>
				<p className="mt-1 text-xs text-muted">
					Add, edit, reorder, and remove the sessions shown on the public site. Drag to reorder.
				</p>
			</section>
			<WorkshopManager workshops={[...workshops]} />
		</div>
	);
}

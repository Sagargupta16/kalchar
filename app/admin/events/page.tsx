import { getAllEvents } from "@/lib/data";
import { AdminPageHeader } from "../_components/admin-page-header";
import { EventsManager } from "../_components/events-manager";

export default async function AdminEventsPage() {
	const events = await getAllEvents();

	return (
		<div className="max-w-3xl space-y-6">
			<AdminPageHeader
				title="Events"
				description="Add workshops held, exhibitions, classes, and gatherings. Each event is a photo gallery. The public page shows newest first; pin one to keep it at the top."
			/>
			<EventsManager events={[...events]} />
		</div>
	);
}

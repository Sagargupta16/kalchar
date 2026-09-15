import { requireAdminPage } from "@/lib/admin-auth";
import { getAllEvents } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { EventsManager } from "../_components/events-manager";

/** An event batch processes up to 12 masters in one action; see app/admin/page.tsx. */
export const maxDuration = 60;

export default async function AdminEventsPage() {
	await requireAdminPage();
	const events = await getAllEvents();

	return (
		<AdminPage
			title="Events"
			description="Workshops held, exhibitions, classes and gatherings, each with its own photo gallery. The public page shows the newest first; pin one to keep it at the top."
		>
			<EventsManager events={[...events]} />
		</AdminPage>
	);
}

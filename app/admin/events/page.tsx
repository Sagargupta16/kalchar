import { getAllEvents } from "@/lib/data";
import { EventsManager } from "../_components/events-manager";

export default async function AdminEventsPage() {
	const events = await getAllEvents();

	return (
		<div className="max-w-3xl space-y-6">
			<section>
				<h2 className="text-sm font-semibold">Events</h2>
				<p className="mt-1 text-xs text-muted">
					Add workshops held, exhibitions, classes, and gatherings. Each event is a photo gallery.
					The public page shows newest first; pin one to keep it at the top.
				</p>
			</section>
			<EventsManager events={[...events]} />
		</div>
	);
}

import { AdminPageSkeleton } from "../_components/admin-page";
import { AdminListHeaderSkeleton, AdminRowsSkeleton } from "../_components/admin-skeletons";

/** At rest the events list spans the page with Add in its header (the create column opens on demand). */
export default function AdminEventsLoading() {
	return (
		<AdminPageSkeleton>
			<section>
				<AdminListHeaderSkeleton />
				<AdminRowsSkeleton count={3} controls={2} />
			</section>
		</AdminPageSkeleton>
	);
}

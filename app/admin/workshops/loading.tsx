import { AdminPageSkeleton } from "../_components/admin-page";
import { AdminListHeaderSkeleton, AdminRowsSkeleton } from "../_components/admin-skeletons";

/** Full-width list with Add in its header; rows lead with the round duration disc. */
export default function AdminWorkshopsLoading() {
	return (
		<AdminPageSkeleton>
			<section>
				<AdminListHeaderSkeleton />
				<AdminRowsSkeleton count={5} thumb="size-12 rounded-full" controls={3} />
			</section>
		</AdminPageSkeleton>
	);
}
